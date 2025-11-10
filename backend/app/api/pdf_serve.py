"""Serve PDF files from the workspace outputs"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path
from urllib.parse import unquote

router = APIRouter()

@router.get("/property/{property_address}")
def get_property_pdf(property_address: str):
    """
    Get the most recent PDF for a property by address (inline viewing)
    """
    # Import path utilities
    from ..lib.paths import find_latest_report_dir_by_address

    # Decode the address (it might be URL encoded)
    address = unquote(property_address)

    # Find the latest report directory for this address
    report_dir = find_latest_report_dir_by_address(address)

    if not report_dir:
        raise HTTPException(
            status_code=404,
            detail=f"No report found for property: {address}"
        )

    # Look for PDF in the pdf subdirectory
    pdf_dir = report_dir / "pdf"

    if not pdf_dir.exists():
        raise HTTPException(
            status_code=404,
            detail=f"PDF directory not found for property: {address}"
        )

    # Find the PDF file (should be only one)
    pdf_files = list(pdf_dir.glob("*.pdf"))

    if not pdf_files:
        raise HTTPException(
            status_code=404,
            detail=f"No PDF file found for property: {address}"
        )

    # Use the first PDF file found
    pdf_file = pdf_files[0]

    # Return the PDF file with inline display
    return FileResponse(
        str(pdf_file),
        media_type="application/pdf",
        headers={
            "Content-Disposition": "inline",
            "Cache-Control": "public, max-age=3600"
        }
    )

@router.get("/property/{property_address}/download")
def download_property_pdf(property_address: str):
    """
    Download the most recent PDF for a property by address
    """
    # Import path utilities
    from ..lib.paths import find_latest_report_dir_by_address

    # Decode the address (it might be URL encoded)
    address = unquote(property_address)

    # Find the latest report directory for this address
    report_dir = find_latest_report_dir_by_address(address)

    if not report_dir:
        raise HTTPException(
            status_code=404,
            detail=f"No report found for property: {address}"
        )

    # Look for PDF in the pdf subdirectory
    pdf_dir = report_dir / "pdf"

    if not pdf_dir.exists():
        raise HTTPException(
            status_code=404,
            detail=f"PDF directory not found for property: {address}"
        )

    # Find the PDF file (should be only one)
    pdf_files = list(pdf_dir.glob("*.pdf"))

    if not pdf_files:
        raise HTTPException(
            status_code=404,
            detail=f"No PDF file found for property: {address}"
        )

    # Use the first PDF file found
    pdf_file = pdf_files[0]

    # Return the PDF file with download headers
    filename = f"{address.replace(' ', '_').replace('/', '_')}_inspection_report.pdf"
    return FileResponse(
        str(pdf_file),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-cache"
        }
    )

@router.get("/report/{report_id}")
def get_report_pdf(report_id: str):
    """
    Get PDF by report ID (which is the directory name)
    """
    from ..lib.paths import outputs_root

    outputs_dir = outputs_root()

    # The report_id is the directory name like "904 marshal st_20251009_203310"
    report_dir = outputs_dir / report_id

    if not report_dir.exists():
        # Try URL decoding the report_id in case it was encoded
        report_id_decoded = unquote(report_id)
        report_dir = outputs_dir / report_id_decoded

        if not report_dir.exists():
            raise HTTPException(
                status_code=404,
                detail=f"Report not found: {report_id}"
            )

    # Look for PDF in the pdf subdirectory
    pdf_dir = report_dir / "pdf"

    if not pdf_dir.exists():
        raise HTTPException(
            status_code=404,
            detail=f"PDF directory not found for report: {report_id}"
        )

    # Find the PDF file
    pdf_files = list(pdf_dir.glob("*.pdf"))

    if not pdf_files:
        raise HTTPException(
            status_code=404,
            detail=f"No PDF file found for report: {report_id}"
        )

    # Use the first PDF file found
    pdf_file = pdf_files[0]

    # Return the PDF file with inline display
    return FileResponse(
        str(pdf_file),
        media_type="application/pdf",
        headers={
            "Content-Disposition": "inline",
            "Cache-Control": "public, max-age=3600"
        }
    )