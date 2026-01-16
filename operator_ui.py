# operator_ui.py - CheckMyRental Inspection Report Generator
# Premium, polished design with modern aesthetics
# Uses vision.py for AI analysis and run_report.py for PDF generation

import os
import sys
import threading
import queue
import re
from pathlib import Path
import platform
import subprocess

# Enable DPI awareness for Windows
if platform.system() == 'Windows':
    import ctypes
    try:
        ctypes.windll.shcore.SetProcessDpiAwareness(2)
    except Exception:
        try:
            ctypes.windll.user32.SetProcessDPIAware()
        except Exception:
            pass

import tkinter as tk
from tkinter import filedialog, messagebox, ttk

try:
    from dotenv import load_dotenv
    # Load .env from the same directory as this script
    env_path = Path(__file__).parent / '.env'
    load_dotenv(env_path, override=True)
except Exception:
    pass

# ============ BRANDING ============
COMPANY_NAME = "CheckMyRental"
APP_TITLE = "Inspection Report Generator"

# Colors - Premium dark theme with gradients feel
BG_DARK = "#0f0f1a"          # Deep dark background
BG_SECONDARY = "#1a1a2e"     # Secondary background
BG_CARD = "#252542"          # Card background
BG_CARD_HOVER = "#2d2d4a"    # Card hover
ACCENT = "#e74c3c"           # Red accent (brand color)
ACCENT_HOVER = "#ff5f4f"     # Lighter red on hover
ACCENT_GLOW = "#ff6b5b"      # Glow effect
TEXT_PRIMARY = "#ffffff"     # White
TEXT_SECONDARY = "#8892b0"   # Muted blue-gray
TEXT_MUTED = "#5a6080"       # More muted
SUCCESS = "#00d09c"          # Green
SUCCESS_DARK = "#00a87d"     # Darker green
ERROR = "#ff6b6b"            # Red
BORDER = "#3d3d5c"           # Subtle border

# Output directory
OUTPUT_DIR = Path("workspace/outputs")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

PROGRESS_RE = re.compile(r"\[(\d+)\s*/\s*(\d+)\]")
IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.heic', '.heif'}



class ReportGeneratorApp(tk.Tk):
    def __init__(self):
        super().__init__()

        self.title(f"{COMPANY_NAME} — {APP_TITLE}")
        self.configure(bg=BG_DARK)
        self.geometry("600x720")
        self.minsize(600, 720)
        self.resizable(True, True)

        # State
        self.sources = []
        self.is_running = False
        self.output_queue = queue.Queue()

        self._build_ui()
        self.after(500, self._check_api_key)
        self._poll_output()

    def _build_ui(self):
        """Build premium, polished UI"""

        # Main container with padding
        main = tk.Frame(self, bg=BG_DARK, padx=35, pady=30)
        main.pack(fill="both", expand=True)

        # ===== HEADER =====
        header = tk.Frame(main, bg=BG_DARK)
        header.pack(fill="x", pady=(0, 8))

        # Logo container
        logo_frame = tk.Frame(header, bg=BG_DARK)
        logo_frame.pack(side="left")

        # Checkmark icon
        tk.Label(logo_frame, text="✓", font=('Segoe UI', 28, 'bold'),
                fg=ACCENT, bg=BG_DARK).pack(side="left")

        # Company name
        tk.Label(logo_frame, text=f"  {COMPANY_NAME}",
                font=('Segoe UI', 20, 'bold'),
                fg=TEXT_PRIMARY, bg=BG_DARK).pack(side="left")

        # Open folder button (top right)
        open_btn = tk.Label(header, text="📂 Open Reports",
                           font=('Segoe UI', 10),
                           fg=TEXT_MUTED, bg=BG_DARK, cursor="hand2")
        open_btn.pack(side="right", padx=(10, 0))
        open_btn.bind("<Button-1>", lambda e: self._open_output())
        open_btn.bind("<Enter>", lambda e: open_btn.config(fg=TEXT_SECONDARY))
        open_btn.bind("<Leave>", lambda e: open_btn.config(fg=TEXT_MUTED))

        # API Status badge (top right)
        self.api_status = tk.Label(header, text="",
                                  font=('Segoe UI', 9), bg=BG_DARK)
        self.api_status.pack(side="right", padx=(10, 0))

        # Subtitle
        tk.Label(main, text="Professional Property Inspection Reports",
                font=('Segoe UI', 11),
                fg=TEXT_MUTED, bg=BG_DARK).pack(anchor="w", pady=(0, 12))

        # ===== FILE SELECTION CARD =====
        card = self._create_card(main)
        card.pack(fill="x", pady=(0, 12))

        # Card header
        card_header = tk.Frame(card, bg=BG_CARD)
        card_header.pack(fill="x", pady=(0, 12))

        tk.Label(card_header, text="Photo Sources",
                font=('Segoe UI', 13, 'bold'),
                fg=TEXT_PRIMARY, bg=BG_CARD).pack(side="left")

        self.file_count_label = tk.Label(card_header, text="No files selected",
                                        font=('Segoe UI', 11),
                                        fg=TEXT_SECONDARY, bg=BG_CARD)
        self.file_count_label.pack(side="right")

        # Separator
        tk.Frame(card, bg=BORDER, height=1).pack(fill="x", pady=(0, 12))

        # Add files buttons row
        btn_row = tk.Frame(card, bg=BG_CARD)
        btn_row.pack(fill="x")

        # Folder button
        folder_btn = self._create_action_button(btn_row, "+ Add Folder", self._add_folder)
        folder_btn.pack(side="left", padx=(0, 10))

        # Clear button (muted)
        clear_btn = tk.Label(btn_row, text="Clear",
                            font=('Segoe UI', 10),
                            fg=TEXT_MUTED, bg=BG_CARD, cursor="hand2")
        clear_btn.pack(side="right")
        clear_btn.bind("<Button-1>", lambda e: self._clear_sources())
        clear_btn.bind("<Enter>", lambda e: clear_btn.config(fg=ERROR))
        clear_btn.bind("<Leave>", lambda e: clear_btn.config(fg=TEXT_MUTED))

        # File preview list (shows uploaded file names) with scrollable area
        self.file_preview_frame = tk.Frame(card, bg=BG_CARD)
        self.file_preview_frame.pack(fill="x", pady=(12, 0))
        self.file_preview_frame.pack_forget()  # Hidden initially

        # Canvas for scrolling
        self.preview_canvas = tk.Canvas(self.file_preview_frame, bg=BG_SECONDARY,
                                        highlightthickness=0, height=120)
        self.preview_canvas.pack(side="left", fill="both", expand=True)

        # Scrollbar
        self.preview_scrollbar = tk.Scrollbar(self.file_preview_frame, orient="vertical",
                                              command=self.preview_canvas.yview)
        self.preview_scrollbar.pack(side="right", fill="y")
        self.preview_canvas.configure(yscrollcommand=self.preview_scrollbar.set)

        # Inner frame for content
        self.file_preview_list = tk.Frame(self.preview_canvas, bg=BG_SECONDARY)
        self.preview_canvas_window = self.preview_canvas.create_window((0, 0),
                                                                        window=self.file_preview_list,
                                                                        anchor="nw")

        # Bind canvas resize
        self.file_preview_list.bind("<Configure>", self._on_preview_configure)
        self.preview_canvas.bind("<Configure>", self._on_canvas_configure)

        # Bind mouse wheel for scrolling
        self.preview_canvas.bind("<MouseWheel>", self._on_preview_mousewheel)
        self.file_preview_list.bind("<MouseWheel>", self._on_preview_mousewheel)

        # ===== CLIENT NAME CARD =====
        name_card = self._create_card(main)
        name_card.pack(fill="x", pady=(0, 12))

        tk.Label(name_card, text="Client Name",
                font=('Segoe UI', 13, 'bold'),
                fg=TEXT_PRIMARY, bg=BG_CARD).pack(anchor="w", pady=(0, 10))

        # Entry with styled frame - using ttk.Entry for better Mac compatibility
        entry_frame = tk.Frame(name_card, bg=BG_SECONDARY)
        entry_frame.pack(fill="x", padx=15, pady=12)

        # Configure ttk style for the entry
        style = ttk.Style()
        style.configure("Dark.TEntry",
                       fieldbackground=BG_SECONDARY,
                       background=BG_SECONDARY,
                       foreground=TEXT_PRIMARY,
                       insertcolor=TEXT_PRIMARY)

        self.inspector_var = tk.StringVar()
        self.name_entry = ttk.Entry(entry_frame, textvariable=self.inspector_var,
                                    font=('Segoe UI', 12),
                                    style="Dark.TEntry")
        self.name_entry.pack(fill="x")

        # ===== GENERATE BUTTON =====
        self.generate_btn = tk.Frame(main, bg=ACCENT, cursor="hand2")
        self.generate_btn.pack(fill="x", pady=(12, 12), ipady=14)

        self.generate_label = tk.Label(self.generate_btn, text="Generate Reports",
                                       font=('Segoe UI', 14, 'bold'),
                                       fg=TEXT_PRIMARY, bg=ACCENT)
        self.generate_label.pack()

        # Bind click and hover
        for widget in [self.generate_btn, self.generate_label]:
            widget.bind("<Button-1>", self._on_button_click)
            widget.bind("<Enter>", lambda e: self._btn_hover(True))
            widget.bind("<Leave>", lambda e: self._btn_hover(False))

        # ===== PROGRESS SECTION =====
        progress_card = self._create_card(main)
        progress_card.pack(fill="x", pady=(0, 12))

        # Progress header
        progress_header = tk.Frame(progress_card, bg=BG_CARD)
        progress_header.pack(fill="x", pady=(0, 10))

        tk.Label(progress_header, text="Progress",
                font=('Segoe UI', 13, 'bold'),
                fg=TEXT_PRIMARY, bg=BG_CARD).pack(side="left")

        self.progress_percent = tk.Label(progress_header, text="0%",
                                        font=('Segoe UI', 12, 'bold'),
                                        fg=ACCENT, bg=BG_CARD)
        self.progress_percent.pack(side="right")

        # Custom progress bar frame
        progress_bg = tk.Frame(progress_card, bg=BG_SECONDARY, height=6)
        progress_bg.pack(fill="x", pady=(0, 10))
        progress_bg.pack_propagate(False)

        self.progress_fill = tk.Frame(progress_bg, bg=ACCENT, height=6)
        self.progress_fill.place(x=0, y=0, relheight=1, relwidth=0)

        # Status label
        self.status_label = tk.Label(progress_card, text="Ready",
                                    font=('Segoe UI', 11),
                                    fg=SUCCESS, bg=BG_CARD, anchor="w")
        self.status_label.pack(fill="x")

        # Log label
        self.log_label = tk.Label(progress_card, text="Add files to begin",
                                 font=('Segoe UI', 10),
                                 fg=TEXT_MUTED, bg=BG_CARD,
                                 anchor="w")
        self.log_label.pack(fill="x", pady=(4, 0))

    def _btn_hover(self, entering):
        """Handle generate button hover"""
        if self.is_running:
            return 
        color = ACCENT_HOVER if entering else ACCENT
        self.generate_btn.config(bg=color)
        self.generate_label.config(bg=color)

    def _create_card(self, parent):
        """Create a styled card frame"""
        card = tk.Frame(parent, bg=BG_CARD, padx=20, pady=16)
        return card

    def _create_action_button(self, parent, text, command):
        """Create an action button"""
        btn = tk.Label(parent, text=text,
                      font=('Segoe UI', 10, 'bold'),
                      fg=ACCENT, bg=BG_CARD,
                      cursor="hand2", padx=8, pady=4)
        btn.bind("<Button-1>", lambda e: command())
        btn.bind("<Enter>", lambda e: btn.config(fg=ACCENT_HOVER))
        btn.bind("<Leave>", lambda e: btn.config(fg=ACCENT))
        return btn

    def _on_preview_configure(self, event):
        """Update scroll region when preview content changes"""
        self.preview_canvas.configure(scrollregion=self.preview_canvas.bbox("all"))

    def _on_canvas_configure(self, event):
        """Update inner frame width when canvas resizes"""
        self.preview_canvas.itemconfig(self.preview_canvas_window, width=event.width)

    def _on_preview_mousewheel(self, event):
        """Handle mouse wheel scrolling on the preview list"""
        self.preview_canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")

    def _on_button_click(self, event):
        """Handle big button click"""
        if self.is_running:
            return  # Can't stop mid-process for now
        self._generate_reports()

    def _check_api_key(self):
        key = os.getenv("OPENAI_API_KEY", "").strip()
        if key:
            self.api_status.config(text="● Connected", fg=SUCCESS)
        else:
            self.api_status.config(text="● No API Key", fg=ERROR)
            messagebox.showwarning("API Key Required",
                "OpenAI API key not found.\n\nPlease add OPENAI_API_KEY to your .env file.")

    def _add_folder(self):
        folder = filedialog.askdirectory(title="Select photo folder")
        if folder and folder not in [s[0] for s in self.sources]:
            count = self._count_images(folder)
            if count > 0:
                self.sources.append((folder, 'folder'))
                self._update_file_count()
            else:
                messagebox.showwarning("No Photos", "No image files found in folder.")

    def _count_images(self, folder):
        count = 0
        for ext in IMAGE_EXTENSIONS:
            count += len(list(Path(folder).rglob(f"*{ext}")))
            count += len(list(Path(folder).rglob(f"*{ext.upper()}")))
        return count

    def _clear_sources(self):
        self.sources = []
        self._update_file_count()

    def _update_file_count(self):
        count = len(self.sources)
        if count == 0:
            self.file_count_label.config(text="No files selected")
            self.file_preview_frame.pack_forget()
        else:
            self.file_count_label.config(text=f"{count} source{'s' if count != 1 else ''}")
            self._update_file_preview()

    def _update_file_preview(self):
        """Update the file preview list with uploaded file names"""
        # Clear existing preview items
        for widget in self.file_preview_list.winfo_children():
            widget.destroy()

        if not self.sources:
            self.file_preview_frame.pack_forget()
            return

        # Show the preview frame
        self.file_preview_frame.pack(fill="x", pady=(12, 0))

        # Add each source as a preview item
        for i, (source_path, source_type) in enumerate(self.sources):
            item_frame = tk.Frame(self.file_preview_list, bg=BG_SECONDARY)
            item_frame.pack(fill="x", padx=8, pady=(4 if i == 0 else 2, 4 if i == len(self.sources) - 1 else 0))

            # Icon based on type
            icon = "📁" if source_type == 'folder' else "📦"

            # Get display name (shortened if too long)
            name = Path(source_path).name
            if len(name) > 40:
                name = name[:37] + "..."

            # Count images in source
            if source_type == 'folder':
                img_count = self._count_images(source_path)
                count_text = f"  ({img_count} photos)"
            else:
                count_text = ""

            tk.Label(item_frame, text=f"{icon}  {name}{count_text}",
                    font=('Segoe UI', 10),
                    fg=TEXT_SECONDARY, bg=BG_SECONDARY,
                    anchor="w").pack(side="left", fill="x")

    def _generate_reports(self):
        if not self.sources:
            messagebox.showwarning("No Files", "Add ZIP files or photo folders first.")
            return

        inspector = self.inspector_var.get().strip() or "Property Owner"

        self.is_running = True
        self._update_button_state()
        self.status_label.config(text="Processing...", fg=ACCENT)
        self._set_progress(0)
        self.log_label.config(text="Starting...")

        thread = threading.Thread(target=self._run_reports,
                                 args=(self.sources.copy(), inspector))
        thread.daemon = True
        thread.start()

    def _update_button_state(self):
        """Update generate button appearance based on running state"""
        if self.is_running:
            self.generate_btn.config(bg=TEXT_MUTED)
            self.generate_label.config(text="Processing...", bg=TEXT_MUTED)
        else:
            self.generate_btn.config(bg=ACCENT)
            self.generate_label.config(text="Generate Reports", bg=ACCENT)

    def _set_progress(self, value):
        """Update custom progress bar"""
        self.progress_fill.place(x=0, y=0, relheight=1, relwidth=value / 100)
        self.progress_percent.config(text=f"{int(value)}%")

    def _run_reports(self, sources, inspector):
        total = len(sources)
        generated = []

        for i, (source_path, source_type) in enumerate(sources, 1):
            name = Path(source_path).name
            self.output_queue.put(('log', f"Processing {name}..."))
            self.output_queue.put(('progress', (i - 1) / total * 100))

            try:
                if source_type == 'zip':
                    cmd = [sys.executable, "run_report.py", "--zip", source_path, "--client", inspector]
                else:
                    cmd = [sys.executable, "run_report.py", "--dir", source_path, "--client", inspector]

                process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                          text=True, cwd=str(Path(__file__).parent),
                                          encoding='utf-8', errors='replace')

                for line in iter(process.stdout.readline, ''):
                    line = line.strip()
                    if line:
                        match = PROGRESS_RE.search(line)
                        if match:
                            current, total_img = int(match.group(1)), int(match.group(2))
                            sub = current / total_img * 100
                            overall = (i - 1) / total * 100 + (sub / total)
                            self.output_queue.put(('progress', overall))
                        if "PDF saved" in line or "PDF generated" in line:
                            generated.append(name)
                            self.output_queue.put(('log', f"✓ {name} complete"))

                exit_code = process.wait()
                if exit_code != 0:
                    self.output_queue.put(('log', f"⚠ {name} failed (exit {exit_code})"))
            except Exception as e:
                self.output_queue.put(('log', f"Error: {e}"))

        self.output_queue.put(('progress', 100))
        self.output_queue.put(('done', len(generated)))

    def _poll_output(self):
        try:
            while True:
                msg_type, data = self.output_queue.get_nowait()
                if msg_type == 'log':
                    self.log_label.config(text=data)
                elif msg_type == 'progress':
                    self._set_progress(data)
                elif msg_type == 'done':
                    self._on_complete(data)
        except queue.Empty:
            pass
        self.after(100, self._poll_output)

    def _on_complete(self, count):
        self.is_running = False
        self._update_button_state()

        if count > 0:
            self.status_label.config(text=f"Done - {count} report{'s' if count != 1 else ''} generated", fg=SUCCESS)
            self.log_label.config(text="All reports completed successfully!")
            if messagebox.askyesno("Complete", f"Successfully generated {count} report{'s' if count != 1 else ''}.\n\nOpen reports folder?"):
                self._open_output()
        else:
            self.status_label.config(text="No Reports Generated", fg=ERROR)
            self.log_label.config(text="Check your files and try again")

    def _open_output(self):
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
    try:
        app = ReportGeneratorApp()
        app.mainloop()
    except Exception as e:
        import traceback
        error_msg = f"Error starting app:\n{traceback.format_exc()}"
        print(error_msg)
        # Also show in a message box if possible
        try:
            import tkinter.messagebox as mb
            mb.showerror("Startup Error", str(e))
        except:
            pass
        raise


if __name__ == "__main__":
    main()
