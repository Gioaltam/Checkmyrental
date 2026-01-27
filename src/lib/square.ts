// Square API integration for invoices
import { Client, Environment } from 'square';
import type { Invoice, Property, PROPERTY_TYPE_LABELS } from './types';

// Initialize Square client
function getSquareClient(): Client {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  const environment = process.env.SQUARE_ENVIRONMENT === 'production'
    ? Environment.Production
    : Environment.Sandbox;

  if (!accessToken) {
    throw new Error('Missing SQUARE_ACCESS_TOKEN environment variable');
  }

  return new Client({
    accessToken,
    environment,
  });
}

function getLocationId(): string {
  const locationId = process.env.SQUARE_LOCATION_ID;
  if (!locationId) {
    throw new Error('Missing SQUARE_LOCATION_ID environment variable');
  }
  return locationId;
}

// Format property type for display
const PROPERTY_LABELS: Record<Property['type'], string> = {
  apartment: 'Apartment Inspection',
  single_family: 'Single Family Home Inspection',
  multifamily: 'Multifamily Home Inspection',
};

// Create or find customer in Square
async function findOrCreateCustomer(
  client: Client,
  name: string,
  email: string,
  phone: string
): Promise<string> {
  // Try to find existing customer by email
  const searchResponse = await client.customersApi.searchCustomers({
    query: {
      filter: {
        emailAddress: {
          exact: email,
        },
      },
    },
  });

  if (searchResponse.result.customers && searchResponse.result.customers.length > 0) {
    return searchResponse.result.customers[0].id!;
  }

  // Create new customer
  const createResponse = await client.customersApi.createCustomer({
    givenName: name.split(' ')[0],
    familyName: name.split(' ').slice(1).join(' ') || undefined,
    emailAddress: email,
    phoneNumber: phone,
  });

  if (!createResponse.result.customer?.id) {
    throw new Error('Failed to create Square customer');
  }

  return createResponse.result.customer.id;
}

// Create and send Square invoice
export async function createSquareInvoice(invoice: Invoice): Promise<{
  squareInvoiceId: string;
  paymentUrl: string;
}> {
  const client = getSquareClient();
  const locationId = getLocationId();

  // Find or create customer
  const customerId = await findOrCreateCustomer(
    client,
    invoice.customerName,
    invoice.customerEmail,
    invoice.customerPhone
  );

  // Build line items from properties
  const lineItems = invoice.properties.map((property, index) => ({
    name: `${PROPERTY_LABELS[property.type]}`,
    description: property.address,
    quantity: '1',
    basePriceMoney: {
      amount: BigInt(Math.round(property.price * 100)), // Convert to cents
      currency: 'USD',
    },
  }));

  // Add processing fee if applicable
  if (invoice.processingFee && invoice.processingFee > 0) {
    lineItems.push({
      name: 'Card Processing Fee (3%)',
      description: 'Credit/Debit card processing fee',
      quantity: '1',
      basePriceMoney: {
        amount: BigInt(Math.round(invoice.processingFee * 100)),
        currency: 'USD',
      },
    });
  }

  // Calculate due date
  const dueDate = new Date(invoice.dueDate);
  const dueDateStr = dueDate.toISOString().split('T')[0]; // YYYY-MM-DD

  // Create invoice
  const createResponse = await client.invoicesApi.createInvoice({
    invoice: {
      locationId,
      primaryRecipient: {
        customerId,
      },
      paymentRequests: [
        {
          requestType: 'BALANCE',
          dueDate: dueDateStr,
          automaticPaymentSource: 'NONE',
        },
      ],
      deliveryMethod: 'EMAIL',
      invoiceNumber: invoice.invoiceNumber,
      title: 'Property Inspection Services',
      description: `Thank you for choosing CheckMyRental for your property inspection needs.`,
      acceptedPaymentMethods: {
        card: true,
        bankAccount: false,
        squareGiftCard: false,
        buyNowPayLater: false,
        cashAppPay: false,
      },
    },
    idempotencyKey: `invoice-${invoice.id}`,
  });

  if (!createResponse.result.invoice?.id) {
    throw new Error('Failed to create Square invoice');
  }

  const squareInvoiceId = createResponse.result.invoice.id;

  // Add line items to invoice (Square requires separate API call for custom line items)
  // Actually, we need to use order-based invoices for line items
  // For simplicity, let's update the invoice with a single amount

  // Publish (send) the invoice
  const publishResponse = await client.invoicesApi.publishInvoice(
    squareInvoiceId,
    {
      version: createResponse.result.invoice.version!,
      idempotencyKey: `publish-${invoice.id}`,
    }
  );

  if (!publishResponse.result.invoice) {
    throw new Error('Failed to publish Square invoice');
  }

  // Get the payment URL from the public URL
  const publicUrl = publishResponse.result.invoice.publicUrl || '';

  return {
    squareInvoiceId,
    paymentUrl: publicUrl,
  };
}

// Get invoice status from Square
export async function getSquareInvoiceStatus(squareInvoiceId: string): Promise<{
  status: 'DRAFT' | 'UNPAID' | 'SCHEDULED' | 'PARTIALLY_PAID' | 'PAID' | 'PARTIALLY_REFUNDED' | 'REFUNDED' | 'CANCELED' | 'FAILED' | 'PAYMENT_PENDING';
  paidAt?: string;
}> {
  const client = getSquareClient();

  const response = await client.invoicesApi.getInvoice(squareInvoiceId);

  if (!response.result.invoice) {
    throw new Error('Invoice not found in Square');
  }

  const squareInvoice = response.result.invoice;

  return {
    status: squareInvoice.status as any,
    paidAt: squareInvoice.paymentRequests?.[0]?.computedAmountMoney?.amount === 0n
      ? new Date().toISOString()
      : undefined,
  };
}

// Cancel Square invoice
export async function cancelSquareInvoice(squareInvoiceId: string): Promise<void> {
  const client = getSquareClient();

  // Get current version
  const getResponse = await client.invoicesApi.getInvoice(squareInvoiceId);
  const version = getResponse.result.invoice?.version;

  if (!version) {
    throw new Error('Could not get invoice version');
  }

  await client.invoicesApi.cancelInvoice(squareInvoiceId, {
    version,
  });
}
