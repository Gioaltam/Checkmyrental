# operator_ui.py - CheckMyRental Inspection Report Generator
# Clean, minimal design inspired by ExpressVPN
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
from tkinter import ttk, filedialog, messagebox

try:
    from dotenv import load_dotenv
    load_dotenv(override=True)
except Exception:
    pass

# ============ BRANDING ============
COMPANY_NAME = "CheckMyRental"
APP_TITLE = "Report Generator"

# Colors - Clean dark theme
BG_DARK = "#1a1a2e"          # Deep blue-black background
BG_CARD = "#16213e"          # Card background
ACCENT = "#e74c3c"           # Red accent (brand color)
ACCENT_HOVER = "#c0392b"     # Darker red
TEXT_PRIMARY = "#ffffff"     # White
TEXT_SECONDARY = "#8892b0"   # Muted blue-gray
SUCCESS = "#00d09c"          # Green
ERROR = "#ff6b6b"            # Red

# Output directory
OUTPUT_DIR = Path("workspace/outputs")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

PROGRESS_RE = re.compile(r"\[(\d+)\s*/\s*(\d+)\]")
IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.heic', '.heif'}


class ReportGeneratorApp(tk.Tk):
    def __init__(self):
        super().__init__()

        self.title(f"{COMPANY_NAME} {APP_TITLE}")
        self.configure(bg=BG_DARK)
        self.geometry("420x600")
        self.resizable(False, False)

        # State
        self.sources = []
        self.is_running = False
        self.output_queue = queue.Queue()

        self._build_ui()
        self.after(500, self._check_api_key)
        self._poll_output()

    def _build_ui(self):
        """Build clean, minimal UI"""

        # Main container with padding
        main = tk.Frame(self, bg=BG_DARK, padx=30, pady=25)
        main.pack(fill="both", expand=True)

        # ===== HEADER =====
        header = tk.Frame(main, bg=BG_DARK)
        header.pack(fill="x", pady=(0, 20))

        # Logo
        tk.Label(header, text="✓", font=('Segoe UI', 28, 'bold'),
                fg=ACCENT, bg=BG_DARK).pack(side="left")

        tk.Label(header, text=f" {COMPANY_NAME}",
                font=('Segoe UI', 18, 'bold'),
                fg=TEXT_PRIMARY, bg=BG_DARK).pack(side="left")

        # API Status (small, top right)
        self.api_status = tk.Label(header, text="",
                                  font=('Segoe UI', 9), bg=BG_DARK)
        self.api_status.pack(side="right")

        # ===== BIG GENERATE BUTTON =====
        btn_frame = tk.Frame(main, bg=BG_DARK)
        btn_frame.pack(pady=20)

        # Create circular-ish button using Canvas
        self.btn_canvas = tk.Canvas(btn_frame, width=160, height=160,
                                   bg=BG_DARK, highlightthickness=0)
        self.btn_canvas.pack()

        # Draw button circle
        self._draw_button("normal")

        # Bind click events
        self.btn_canvas.bind("<Button-1>", self._on_button_click)
        self.btn_canvas.bind("<Enter>", lambda e: self._draw_button("hover"))
        self.btn_canvas.bind("<Leave>", lambda e: self._draw_button("normal"))

        # Status text below button
        self.status_label = tk.Label(main, text="Ready",
                                    font=('Segoe UI', 12),
                                    fg=SUCCESS, bg=BG_DARK)
        self.status_label.pack(pady=(10, 20))

        # ===== FILE INFO CARD =====
        card = tk.Frame(main, bg=BG_CARD, padx=20, pady=15)
        card.pack(fill="x", pady=(0, 15))

        # Files row
        files_row = tk.Frame(card, bg=BG_CARD)
        files_row.pack(fill="x", pady=(0, 10))

        tk.Label(files_row, text="Photos:",
                font=('Segoe UI', 10), fg=TEXT_SECONDARY, bg=BG_CARD).pack(side="left")

        self.file_count_label = tk.Label(files_row, text="No files selected",
                                        font=('Segoe UI', 10, 'bold'),
                                        fg=TEXT_PRIMARY, bg=BG_CARD)
        self.file_count_label.pack(side="right")

        # Add files buttons
        btn_row = tk.Frame(card, bg=BG_CARD)
        btn_row.pack(fill="x")

        add_zip_btn = tk.Label(btn_row, text="+ ZIP",
                              font=('Segoe UI', 10, 'bold'),
                              fg=ACCENT, bg=BG_CARD, cursor="hand2")
        add_zip_btn.pack(side="left")
        add_zip_btn.bind("<Button-1>", lambda e: self._add_zip_files())

        tk.Label(btn_row, text="  |  ", fg=TEXT_SECONDARY, bg=BG_CARD).pack(side="left")

        add_folder_btn = tk.Label(btn_row, text="+ Folder",
                                 font=('Segoe UI', 10, 'bold'),
                                 fg=ACCENT, bg=BG_CARD, cursor="hand2")
        add_folder_btn.pack(side="left")
        add_folder_btn.bind("<Button-1>", lambda e: self._add_folder())

        tk.Label(btn_row, text="  |  ", fg=TEXT_SECONDARY, bg=BG_CARD).pack(side="left")

        clear_btn = tk.Label(btn_row, text="Clear",
                            font=('Segoe UI', 10),
                            fg=TEXT_SECONDARY, bg=BG_CARD, cursor="hand2")
        clear_btn.pack(side="left")
        clear_btn.bind("<Button-1>", lambda e: self._clear_sources())

        # ===== INSPECTOR NAME =====
        name_card = tk.Frame(main, bg=BG_CARD, padx=20, pady=15)
        name_card.pack(fill="x", pady=(0, 15))

        tk.Label(name_card, text="Inspector Name",
                font=('Segoe UI', 10), fg=TEXT_SECONDARY, bg=BG_CARD).pack(anchor="w")

        self.inspector_var = tk.StringVar()
        name_entry = tk.Entry(name_card, textvariable=self.inspector_var,
                             font=('Segoe UI', 11),
                             bg=BG_DARK, fg=TEXT_PRIMARY,
                             insertbackground=TEXT_PRIMARY,
                             relief="flat", bd=0)
        name_entry.pack(fill="x", pady=(5, 0), ipady=8)

        # ===== PROGRESS =====
        progress_frame = tk.Frame(main, bg=BG_DARK)
        progress_frame.pack(fill="x", pady=(0, 10))

        self.progress_var = tk.DoubleVar(value=0)
        self.progress_bar = ttk.Progressbar(progress_frame,
                                           variable=self.progress_var,
                                           maximum=100, mode='determinate',
                                           length=360)
        self.progress_bar.pack(fill="x")

        # Style the progress bar
        style = ttk.Style()
        style.theme_use('clam')
        style.configure("TProgressbar",
                       background=ACCENT,
                       troughcolor=BG_CARD,
                       borderwidth=0,
                       lightcolor=ACCENT,
                       darkcolor=ACCENT)

        # ===== LOG (minimal) =====
        self.log_label = tk.Label(main, text="",
                                 font=('Segoe UI', 9),
                                 fg=TEXT_SECONDARY, bg=BG_DARK,
                                 wraplength=360)
        self.log_label.pack(fill="x")

        # ===== FOOTER =====
        footer = tk.Frame(main, bg=BG_DARK)
        footer.pack(side="bottom", fill="x", pady=(15, 0))

        open_folder_btn = tk.Label(footer, text="Open Reports Folder",
                                  font=('Segoe UI', 10),
                                  fg=TEXT_SECONDARY, bg=BG_DARK, cursor="hand2")
        open_folder_btn.pack()
        open_folder_btn.bind("<Button-1>", lambda e: self._open_output())

    def _draw_button(self, state):
        """Draw the big circular button"""
        self.btn_canvas.delete("all")

        color = ACCENT if state == "normal" else ACCENT_HOVER
        if self.is_running:
            color = TEXT_SECONDARY

        # Outer glow effect
        for i in range(3):
            alpha_color = self._blend_colors(BG_DARK, color, 0.1 - i * 0.03)
            self.btn_canvas.create_oval(10 - i*5, 10 - i*5,
                                       150 + i*5, 150 + i*5,
                                       fill=alpha_color, outline="")

        # Main circle
        self.btn_canvas.create_oval(15, 15, 145, 145, fill=color, outline="")

        # Button text
        text = "STOP" if self.is_running else "GO"
        self.btn_canvas.create_text(80, 80, text=text,
                                   font=('Segoe UI', 24, 'bold'),
                                   fill=TEXT_PRIMARY)

    def _blend_colors(self, color1, color2, factor):
        """Blend two hex colors"""
        c1 = tuple(int(color1[i:i+2], 16) for i in (1, 3, 5))
        c2 = tuple(int(color2[i:i+2], 16) for i in (1, 3, 5))
        blended = tuple(int(c1[i] + (c2[i] - c1[i]) * factor) for i in range(3))
        return f"#{blended[0]:02x}{blended[1]:02x}{blended[2]:02x}"

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

    def _add_zip_files(self):
        files = filedialog.askopenfilenames(
            title="Select ZIP files",
            filetypes=[("ZIP files", "*.zip")]
        )
        for f in files:
            if f not in [s[0] for s in self.sources]:
                self.sources.append((f, 'zip'))
        self._update_file_count()

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
        else:
            self.file_count_label.config(text=f"{count} source{'s' if count != 1 else ''}")

    def _generate_reports(self):
        if not self.sources:
            messagebox.showwarning("No Files", "Add ZIP files or photo folders first.")
            return

        inspector = self.inspector_var.get().strip() or "Inspector"

        self.is_running = True
        self._draw_button("normal")
        self.status_label.config(text="Processing...", fg=ACCENT)
        self.progress_var.set(0)
        self.log_label.config(text="")

        thread = threading.Thread(target=self._run_reports,
                                 args=(self.sources.copy(), inspector))
        thread.daemon = True
        thread.start()

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
                        if "PDF saved" in line:
                            generated.append(name)
                            self.output_queue.put(('log', f"✓ {name} complete"))

                process.wait()
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
                    self.progress_var.set(data)
                elif msg_type == 'done':
                    self._on_complete(data)
        except queue.Empty:
            pass
        self.after(100, self._poll_output)

    def _on_complete(self, count):
        self.is_running = False
        self._draw_button("normal")
        self.status_label.config(text=f"Done! {count} report{'s' if count != 1 else ''}", fg=SUCCESS)

        if count > 0 and messagebox.askyesno("Complete", f"Generated {count} report{'s' if count != 1 else ''}.\n\nOpen folder?"):
            self._open_output()

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
    app = ReportGeneratorApp()
    app.mainloop()


if __name__ == "__main__":
    main()
