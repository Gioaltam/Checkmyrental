# operator_ui.py - CheckMyRental Inspection Report Generator
# Simple tool for photographers to generate property inspection reports
# Uses vision.py for AI analysis and run_report.py for PDF generation
# Accepts: ZIP files or folders (including Mac photo albums)

import os
import sys
import threading
import queue
import re
from pathlib import Path
import platform
import subprocess

# Enable DPI awareness for Windows (sharper text)
if platform.system() == 'Windows':
    import ctypes
    try:
        ctypes.windll.shcore.SetProcessDpiAwareness(2)
    except Exception:
        try:
            ctypes.windll.user32.SetProcessDPIAware()
        except Exception:
            pass

# GUI
import tkinter as tk
from tkinter import ttk, filedialog, messagebox

# .env for API keys
try:
    from dotenv import load_dotenv
    load_dotenv(override=True)
except Exception:
    pass

# ============ BRANDING ============
COMPANY_NAME = "CheckMyRental"
APP_TITLE = "Report Generator"
APP_VERSION = "v3.0"

# Colors - Dark professional theme
BRAND_PRIMARY = "#e74c3c"       # Red accent
BRAND_BG = "#0f0f0f"            # Dark background
BRAND_SURFACE = "#1a1a1a"       # Card background
BRAND_SURFACE_HOVER = "#252525" # Hover state
BRAND_TEXT = "#fafafa"          # White text
BRAND_TEXT_DIM = "#888888"      # Dimmed text
BRAND_SUCCESS = "#10b981"       # Green
BRAND_ERROR = "#dc2626"         # Red
BRAND_WARNING = "#f59e0b"       # Orange/yellow
BRAND_BORDER = "#333333"        # Border color

# Output directory
OUTPUT_DIR = Path("workspace/outputs")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Progress parsing
PROGRESS_RE = re.compile(r"\[(\d+)\s*/\s*(\d+)\]")

# Supported image extensions
IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.heic', '.heif'}


class ReportGeneratorApp(tk.Tk):
    """Simple app for generating property inspection reports from ZIP files or folders"""

    def __init__(self):
        super().__init__()

        self.title(f"{COMPANY_NAME} - {APP_TITLE}")
        self.configure(bg=BRAND_BG)
        self.geometry("750x800")
        self.minsize(700, 780)
        self.resizable(False, False)  # Disable resizing/fullscreen

        # State
        self.sources = []  # List of (path, type) tuples - type is 'zip' or 'folder'
        self.is_running = False
        self.output_queue = queue.Queue()

        # Build UI
        self._setup_styles()
        self._build_ui()

        # Check for API key
        self.after(500, self._check_api_key)

        # Start output polling
        self._poll_output()

    def _setup_styles(self):
        """Configure ttk styles"""
        self.style = ttk.Style()
        self.style.theme_use('clam')

        # Button styles
        self.style.configure('Primary.TButton',
            background=BRAND_PRIMARY,
            foreground='white',
            font=('Segoe UI', 11, 'bold'),
            padding=(20, 12))
        self.style.map('Primary.TButton',
            background=[('active', '#c0392b'), ('disabled', '#555555')])

        self.style.configure('Secondary.TButton',
            background=BRAND_SURFACE,
            foreground=BRAND_TEXT,
            font=('Segoe UI', 10),
            padding=(15, 10))
        self.style.map('Secondary.TButton',
            background=[('active', BRAND_SURFACE_HOVER)])

        # Entry style
        self.style.configure('TEntry',
            fieldbackground=BRAND_SURFACE,
            foreground=BRAND_TEXT,
            insertcolor=BRAND_TEXT,
            padding=10)

        # Label style
        self.style.configure('TLabel',
            background=BRAND_BG,
            foreground=BRAND_TEXT,
            font=('Segoe UI', 10))

    def _build_ui(self):
        """Build the main UI"""

        # ===== HEADER =====
        header = tk.Frame(self, bg=BRAND_SURFACE, height=70)
        header.pack(fill="x")
        header.pack_propagate(False)

        # Header content
        header_content = tk.Frame(header, bg=BRAND_SURFACE)
        header_content.pack(fill="both", expand=True, padx=25, pady=15)

        # Logo and title
        logo = tk.Label(header_content, text="✓", font=('Segoe UI', 24, 'bold'),
                       fg=BRAND_PRIMARY, bg=BRAND_SURFACE)
        logo.pack(side="left")

        title = tk.Label(header_content, text=f"  {COMPANY_NAME} {APP_TITLE}",
                        font=('Segoe UI', 16, 'bold'), fg=BRAND_TEXT, bg=BRAND_SURFACE)
        title.pack(side="left")

        # Right side: version and API status (pack in reverse order)
        version = tk.Label(header_content, text=APP_VERSION,
                          font=('Segoe UI', 10), fg=BRAND_TEXT_DIM, bg=BRAND_SURFACE)
        version.pack(side="right")

        self.api_status = tk.Label(header_content, text="",
                                  font=('Segoe UI', 10), bg=BRAND_SURFACE)
        self.api_status.pack(side="right", padx=(0, 15))

        # Border
        tk.Frame(self, bg=BRAND_PRIMARY, height=3).pack(fill="x")

        # ===== MAIN CONTENT =====
        content = tk.Frame(self, bg=BRAND_BG)
        content.pack(fill="both", expand=True, padx=25, pady=15)

        # --- File Selection Card ---
        file_card = tk.Frame(content, bg=BRAND_SURFACE, padx=20, pady=15)
        file_card.pack(fill="x", pady=(0, 15))

        tk.Label(file_card, text="Photo Sources",
                font=('Segoe UI', 12, 'bold'), fg=BRAND_TEXT, bg=BRAND_SURFACE).pack(anchor="w")

        tk.Label(file_card, text="Add ZIP files or photo folders (including Mac albums via AirDrop)",
                font=('Segoe UI', 9), fg=BRAND_TEXT_DIM, bg=BRAND_SURFACE).pack(anchor="w", pady=(2, 10))

        # File list
        list_frame = tk.Frame(file_card, bg=BRAND_BG)
        list_frame.pack(fill="x", pady=(0, 10))

        self.file_listbox = tk.Listbox(list_frame, height=4, font=('Segoe UI', 10),
                                       bg=BRAND_BG, fg=BRAND_TEXT,
                                       selectbackground=BRAND_PRIMARY,
                                       borderwidth=0, highlightthickness=1,
                                       highlightcolor=BRAND_BORDER,
                                       highlightbackground=BRAND_BORDER)
        self.file_listbox.pack(side="left", fill="x", expand=True)

        scrollbar = ttk.Scrollbar(list_frame, orient="vertical", command=self.file_listbox.yview)
        scrollbar.pack(side="right", fill="y")
        self.file_listbox.config(yscrollcommand=scrollbar.set)

        # File buttons
        btn_row = tk.Frame(file_card, bg=BRAND_SURFACE)
        btn_row.pack(fill="x")

        ttk.Button(btn_row, text="+ Add ZIP Files", command=self._add_zip_files,
                  style='Secondary.TButton').pack(side="left")
        ttk.Button(btn_row, text="+ Add Photo Folder", command=self._add_folder,
                  style='Secondary.TButton').pack(side="left", padx=(10, 0))
        ttk.Button(btn_row, text="Clear All", command=self._clear_sources,
                  style='Secondary.TButton').pack(side="left", padx=(10, 0))

        self.file_count = tk.Label(btn_row, text="0 sources",
                                  font=('Segoe UI', 10), fg=BRAND_TEXT_DIM, bg=BRAND_SURFACE)
        self.file_count.pack(side="right")

        # --- Details Card ---
        details_card = tk.Frame(content, bg=BRAND_SURFACE, padx=20, pady=15)
        details_card.pack(fill="x", pady=(0, 15))

        tk.Label(details_card, text="Inspector Info",
                font=('Segoe UI', 12, 'bold'), fg=BRAND_TEXT, bg=BRAND_SURFACE).pack(anchor="w")

        tk.Label(details_card, text="Property address is extracted from filename automatically",
                font=('Segoe UI', 9), fg=BRAND_TEXT_DIM, bg=BRAND_SURFACE).pack(anchor="w", pady=(2, 10))

        # Inspector Name
        name_row = tk.Frame(details_card, bg=BRAND_SURFACE)
        name_row.pack(fill="x")

        tk.Label(name_row, text="Your Name:", width=12, anchor="w",
                font=('Segoe UI', 10), fg=BRAND_TEXT, bg=BRAND_SURFACE).pack(side="left")

        self.inspector_var = tk.StringVar()
        self.inspector_entry = ttk.Entry(name_row, textvariable=self.inspector_var,
                                        font=('Segoe UI', 10), width=50)
        self.inspector_entry.pack(side="left", fill="x", expand=True)

        # --- Action Buttons (moved up for visibility) ---
        action_row = tk.Frame(content, bg=BRAND_BG)
        action_row.pack(fill="x", pady=(0, 15))

        self.generate_btn = ttk.Button(action_row, text="Generate Reports",
                                       command=self._generate_reports,
                                       style='Primary.TButton')
        self.generate_btn.pack(side="left")

        ttk.Button(action_row, text="Open Reports Folder", command=self._open_output,
                  style='Secondary.TButton').pack(side="right")

        # --- Progress Section ---
        progress_card = tk.Frame(content, bg=BRAND_SURFACE, padx=20, pady=15)
        progress_card.pack(fill="both", expand=True, pady=(0, 15))

        progress_header = tk.Frame(progress_card, bg=BRAND_SURFACE)
        progress_header.pack(fill="x", pady=(0, 10))

        tk.Label(progress_header, text="Progress",
                font=('Segoe UI', 12, 'bold'), fg=BRAND_TEXT, bg=BRAND_SURFACE).pack(side="left")

        self.status_label = tk.Label(progress_header, text="Ready",
                                    font=('Segoe UI', 10), fg=BRAND_SUCCESS, bg=BRAND_SURFACE)
        self.status_label.pack(side="right")

        # Progress bar
        self.progress_var = tk.DoubleVar(value=0)
        self.progress_bar = ttk.Progressbar(progress_card, variable=self.progress_var,
                                           maximum=100, mode='determinate')
        self.progress_bar.pack(fill="x", pady=(0, 10))

        # Log output with scroll
        log_frame = tk.Frame(progress_card, bg=BRAND_SURFACE)
        log_frame.pack(fill="both", expand=True)

        self.log_text = tk.Text(log_frame, height=5, font=('Consolas', 9),
                               bg=BRAND_BG, fg=BRAND_TEXT,
                               borderwidth=0, highlightthickness=1,
                               highlightcolor=BRAND_BORDER,
                               highlightbackground=BRAND_BORDER,
                               state='disabled')
        self.log_text.pack(side="left", fill="both", expand=True)

        log_scroll = ttk.Scrollbar(log_frame, orient="vertical", command=self.log_text.yview)
        log_scroll.pack(side="right", fill="y")
        self.log_text.config(yscrollcommand=log_scroll.set)

    def _check_api_key(self):
        """Check if OpenAI API key is configured"""
        key = os.getenv("OPENAI_API_KEY", "").strip()
        if key:
            self.api_status.config(text="API Key: OK", fg=BRAND_SUCCESS)
        else:
            self.api_status.config(text="API Key: Missing", fg=BRAND_ERROR)
            messagebox.showwarning("API Key Required",
                "OpenAI API key not found.\n\n"
                "Please add OPENAI_API_KEY to your .env file.")

    def _add_zip_files(self):
        """Add ZIP files to the list"""
        files = filedialog.askopenfilenames(
            title="Select ZIP files with photos",
            filetypes=[("ZIP files", "*.zip"), ("All files", "*.*")]
        )

        for f in files:
            if f not in [s[0] for s in self.sources]:
                self.sources.append((f, 'zip'))
                self.file_listbox.insert(tk.END, f"[ZIP] {Path(f).name}")

        self._update_source_count()

    def _add_folder(self):
        """Add a folder containing photos"""
        folder = filedialog.askdirectory(
            title="Select folder containing photos"
        )

        if folder and folder not in [s[0] for s in self.sources]:
            # Check if folder contains images
            image_count = self._count_images_in_folder(folder)
            if image_count > 0:
                self.sources.append((folder, 'folder'))
                self.file_listbox.insert(tk.END, f"[Folder: {image_count} photos] {Path(folder).name}")
                self._update_source_count()
            else:
                messagebox.showwarning("No Photos Found",
                    f"No image files found in:\n{folder}\n\n"
                    f"Supported formats: {', '.join(IMAGE_EXTENSIONS)}")

    def _count_images_in_folder(self, folder_path):
        """Count image files in a folder"""
        count = 0
        folder = Path(folder_path)
        for ext in IMAGE_EXTENSIONS:
            count += len(list(folder.rglob(f"*{ext}")))
            count += len(list(folder.rglob(f"*{ext.upper()}")))
        return count

    def _clear_sources(self):
        """Clear all sources from the list"""
        self.sources = []
        self.file_listbox.delete(0, tk.END)
        self._update_source_count()

    def _update_source_count(self):
        """Update the source count label"""
        count = len(self.sources)
        self.file_count.config(text=f"{count} source{'s' if count != 1 else ''}")

    def _log(self, message):
        """Add message to log"""
        self.log_text.config(state='normal')
        self.log_text.insert(tk.END, message + "\n")
        self.log_text.see(tk.END)
        self.log_text.config(state='disabled')

    def _clear_log(self):
        """Clear the log"""
        self.log_text.config(state='normal')
        self.log_text.delete(1.0, tk.END)
        self.log_text.config(state='disabled')

    def _generate_reports(self):
        """Start report generation"""
        if self.is_running:
            return

        if not self.sources:
            messagebox.showwarning("No Sources", "Please add ZIP files or photo folders first.")
            return

        inspector = self.inspector_var.get().strip() or "Inspector"

        # Start processing
        self.is_running = True
        self.generate_btn.config(state='disabled')
        self.status_label.config(text="Processing...", fg=BRAND_PRIMARY)
        self.progress_var.set(0)
        self._clear_log()

        # Run in background thread
        thread = threading.Thread(target=self._run_reports,
                                 args=(self.sources.copy(), inspector))
        thread.daemon = True
        thread.start()

    def _run_reports(self, sources, inspector):
        """Run report generation in background thread"""
        total = len(sources)
        generated_pdfs = []

        for i, (source_path, source_type) in enumerate(sources, 1):
            source_name = Path(source_path).name
            self.output_queue.put(('log', f"[{i}/{total}] Processing {source_name}..."))
            self.output_queue.put(('progress', (i - 1) / total * 100))

            try:
                # Build command based on source type
                # Property address is extracted from filename by run_report.py
                if source_type == 'zip':
                    cmd = [
                        sys.executable, "run_report.py",
                        "--zip", source_path,
                        "--client", inspector
                    ]
                else:  # folder
                    cmd = [
                        sys.executable, "run_report.py",
                        "--dir", source_path,
                        "--client", inspector
                    ]

                # Run the command and capture output
                process = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    cwd=str(Path(__file__).parent),
                    encoding='utf-8',
                    errors='replace'
                )

                # Read output line by line
                for line in iter(process.stdout.readline, ''):
                    line = line.strip()
                    if line:
                        # Parse progress updates
                        match = PROGRESS_RE.search(line)
                        if match:
                            current, total_images = int(match.group(1)), int(match.group(2))
                            sub_progress = current / total_images * 100
                            base_progress = (i - 1) / total * 100
                            step_progress = 1 / total * 100
                            overall = base_progress + (sub_progress / 100 * step_progress)
                            self.output_queue.put(('progress', overall))

                        # Check for output directory
                        if "OUTPUT_DIR=" in line:
                            self.output_queue.put(('log', f"  Output: {line.split('=')[1]}"))
                        elif "PDF saved to:" in line:
                            pdf_path = line.split("PDF saved to:")[1].strip()
                            generated_pdfs.append(pdf_path)
                            self.output_queue.put(('log', f"  PDF generated!"))
                        elif "Analyzing" in line:
                            # Show which image is being analyzed
                            self.output_queue.put(('log', f"  {line}"))

                process.wait()

                if process.returncode == 0:
                    self.output_queue.put(('log', f"  Completed successfully"))
                else:
                    self.output_queue.put(('log', f"  Warning: Process returned code {process.returncode}"))

            except Exception as e:
                self.output_queue.put(('log', f"  Error: {str(e)}"))

        # Done
        self.output_queue.put(('progress', 100))
        self.output_queue.put(('done', generated_pdfs))

    def _poll_output(self):
        """Poll the output queue for updates"""
        try:
            while True:
                msg_type, data = self.output_queue.get_nowait()

                if msg_type == 'log':
                    self._log(data)
                elif msg_type == 'progress':
                    self.progress_var.set(data)
                elif msg_type == 'done':
                    self._on_complete(data)

        except queue.Empty:
            pass

        self.after(100, self._poll_output)

    def _on_complete(self, generated_pdfs):
        """Called when processing is complete"""
        self.is_running = False
        self.generate_btn.config(state='normal')
        self.status_label.config(text="Complete!", fg=BRAND_SUCCESS)

        count = len(generated_pdfs)
        self._log(f"\n{'='*40}")
        self._log(f"Generated {count} report{'s' if count != 1 else ''}")

        if generated_pdfs:
            # Ask to open the output folder
            if messagebox.askyesno("Reports Complete",
                f"Generated {count} report{'s' if count != 1 else ''}.\n\n"
                "Open the reports folder?"):
                self._open_output()

    def _open_output(self):
        """Open the output directory"""
        try:
            if platform.system() == 'Windows':
                os.startfile(str(OUTPUT_DIR))
            elif platform.system() == 'Darwin':
                subprocess.run(['open', str(OUTPUT_DIR)])
            else:
                subprocess.run(['xdg-open', str(OUTPUT_DIR)])
        except Exception as e:
            messagebox.showerror("Error", f"Could not open folder: {e}")


def main():
    app = ReportGeneratorApp()
    app.mainloop()


if __name__ == "__main__":
    main()
