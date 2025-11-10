import { NextRequest, NextResponse } from 'next/server';

// In-memory storage for demo (replace with database in production)
let hvacRecords: Record<string, any[]> = {};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const property = searchParams.get('property');
  
  if (!property) {
    return NextResponse.json({ error: 'Property address required' }, { status: 400 });
  }
  
  const records = hvacRecords[property] || [];
  return NextResponse.json({ records });
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { property, ...record } = data;
    
    if (!property) {
      return NextResponse.json({ error: 'Property address required' }, { status: 400 });
    }
    
    if (!hvacRecords[property]) {
      hvacRecords[property] = [];
    }
    
    hvacRecords[property].push(record);
    
    return NextResponse.json({ success: true, record });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const pathParts = request.nextUrl.pathname.split('/');
  const recordId = pathParts[pathParts.length - 1];
  
  if (!recordId || recordId === 'records') {
    return NextResponse.json({ error: 'Record ID required' }, { status: 400 });
  }
  
  // Find and delete the record from all properties
  for (const property in hvacRecords) {
    hvacRecords[property] = hvacRecords[property].filter(r => r.id !== recordId);
  }
  
  return NextResponse.json({ success: true });
}