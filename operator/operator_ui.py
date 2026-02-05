

# operator_ui.py - CheckMyRental Inspection Report Generator
# Premium, polished design with modern aesthetics
# Uses vision.py for AI analysis and run_report.py for PDF generation

import os
import sys
import threading
import queue
import re
import json
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

# Platform-aware font selection
if platform.system() == 'Darwin':  # macOS
    FONT_FAMILY = 'Helvetica Neue'
elif platform.system() == 'Windows':
    FONT_FAMILY = 'Segoe UI'
else:  # Linux
    FONT_FAMILY = 'DejaVu Sans'

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
        self.geometry("600x750")
        self.minsize(600, 700)
        self.resizable(True, True)

        # State
        self.sources = []
        self.inspector_notes = []  # List of note dicts: {text, responsibility, priority}
        self.is_running = False
        self.output_queue = queue.Queue()

        self._build_ui()
        self.after(500, self._check_api_key)
        self._poll_output()


    def _build_ui(self):
        """Build premium, polished UI"""

        # Main container with padding
        main = tk.Frame(self, bg=BG_DARK, padx=35, pady=20)
        main.pack(fill="both", expand=True)

        # ===== HEADER =====
        header = tk.Frame(main, bg=BG_DARK)
        header.pack(fill="x", pady=(0, 8))

        # Logo container
        logo_frame = tk.Frame(header, bg=BG_DARK)
        logo_frame.pack(side="left")

        # Checkmark icon
        tk.Label(logo_frame, text="✓", font=(FONT_FAMILY, 28, 'bold'),
                fg=ACCENT, bg=BG_DARK).pack(side="left")

        # Company name
        tk.Label(logo_frame, text=f"  {COMPANY_NAME}",
                font=(FONT_FAMILY, 20, 'bold'),
                fg=TEXT_PRIMARY, bg=BG_DARK).pack(side="left")

        # Open folder button (top right)
        open_btn = tk.Label(header, text="📂 Open Reports",
                           font=(FONT_FAMILY, 10),
                           fg=TEXT_MUTED, bg=BG_DARK, cursor="hand2", takefocus=False)
        open_btn.pack(side="right", padx=(10, 0))
        open_btn.bind("<Button-1>", lambda e: self._open_output())
        open_btn.bind("<Enter>", lambda e: open_btn.config(fg=TEXT_SECONDARY))
        open_btn.bind("<Leave>", lambda e: open_btn.config(fg=TEXT_MUTED))

        # API Status badge (top right)
        self.api_status = tk.Label(header, text="",
                                  font=(FONT_FAMILY, 9), bg=BG_DARK)
        self.api_status.pack(side="right", padx=(10, 0))

        # Subtitle
        tk.Label(main, text="Professional Property Inspection Reports",
                font=(FONT_FAMILY, 11),
                fg=TEXT_MUTED, bg=BG_DARK).pack(anchor="w", pady=(0, 12))

        # ===== FILE SELECTION CARD =====
        card = self._create_card(main)
        card.pack(fill="x", pady=(0, 8))

        # Card header
        card_header = tk.Frame(card, bg=BG_CARD)
        card_header.pack(fill="x", pady=(0, 8))

        tk.Label(card_header, text="Photo Sources",
                font=(FONT_FAMILY, 13, 'bold'),
                fg=TEXT_PRIMARY, bg=BG_CARD).pack(side="left")

        self.file_count_label = tk.Label(card_header, text="No files selected",
                                        font=(FONT_FAMILY, 11),
                                        fg=TEXT_SECONDARY, bg=BG_CARD)
        self.file_count_label.pack(side="right")

        # Separator
        tk.Frame(card, bg=BORDER, height=1).pack(fill="x", pady=(0, 8))

        # Add files buttons row
        btn_row = tk.Frame(card, bg=BG_CARD)
        btn_row.pack(fill="x")

        # Folder button
        folder_btn = self._create_action_button(btn_row, "+ Add Folder", self._add_folder)
        folder_btn.pack(side="left", padx=(0, 10))

        # Clear button (muted)
        clear_btn = tk.Label(btn_row, text="Clear",
                            font=(FONT_FAMILY, 10),
                            fg=TEXT_MUTED, bg=BG_CARD, cursor="hand2", takefocus=False)
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
                                        highlightthickness=0, height=60)
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
        name_card.pack(fill="x", pady=(0, 8))

        tk.Label(name_card, text="Client Name",
                font=(FONT_FAMILY, 13, 'bold'),
                fg=TEXT_PRIMARY, bg=BG_CARD).pack(anchor="w", pady=(0, 6))

        # Entry with styled frame - using ttk.Entry for better Mac compatibility
        entry_frame = tk.Frame(name_card, bg=BG_SECONDARY)
        entry_frame.pack(fill="x", padx=10, pady=8)

        # Configure ttk style for the entry
        style = ttk.Style()
        style.configure("Dark.TEntry",
                       fieldbackground=BG_SECONDARY,
                       background=BG_SECONDARY,
                       foreground=TEXT_PRIMARY,
                       insertcolor=TEXT_PRIMARY)

        self.inspector_var = tk.StringVar()
        self.name_entry = ttk.Entry(entry_frame, textvariable=self.inspector_var,
                                    font=(FONT_FAMILY, 12),
                                    style="Dark.TEntry")
        self.name_entry.pack(fill="x")

        # ===== INSPECTOR NOTES CARD =====
        notes_card = self._create_card(main)
        notes_card.pack(fill="x", pady=(0, 8))

        # Card header
        notes_header = tk.Frame(notes_card, bg=BG_CARD)
        notes_header.pack(fill="x", pady=(0, 6))

        tk.Label(notes_header, text="Inspector Notes",
                font=(FONT_FAMILY, 13, 'bold'),
                fg=TEXT_PRIMARY, bg=BG_CARD).pack(side="left")

        tk.Label(notes_header, text="(issues photos can't show)",
                font=(FONT_FAMILY, 10),
                fg=TEXT_MUTED, bg=BG_CARD).pack(side="left", padx=(8, 0))

        self.notes_count_label = tk.Label(notes_header, text="",
                                          font=(FONT_FAMILY, 11),
                                          fg=TEXT_SECONDARY, bg=BG_CARD)
        self.notes_count_label.pack(side="right")

        # Separator
        tk.Frame(notes_card, bg=BORDER, height=1).pack(fill="x", pady=(0, 8))

        # Dropdowns row
        dropdowns_row = tk.Frame(notes_card, bg=BG_CARD)
        dropdowns_row.pack(fill="x", pady=(0, 8))

        # Responsibility dropdown
        tk.Label(dropdowns_row, text="Assign to:",
                font=(FONT_FAMILY, 10),
                fg=TEXT_SECONDARY, bg=BG_CARD).pack(side="left")

        self.responsibility_var = tk.StringVar(value="OWNER")
        responsibility_combo = ttk.Combobox(dropdowns_row, textvariable=self.responsibility_var,
                                            values=["OWNER", "TENANT"],
                                            state="readonly", width=10,
                                            font=(FONT_FAMILY, 10))
        responsibility_combo.pack(side="left", padx=(8, 20))

        # Priority dropdown
        tk.Label(dropdowns_row, text="Priority:",
                font=(FONT_FAMILY, 10),
                fg=TEXT_SECONDARY, bg=BG_CARD).pack(side="left")

        self.priority_var = tk.StringVar(value="FIX SOON")
        priority_combo = ttk.Combobox(dropdowns_row, textvariable=self.priority_var,
                                      values=["FIX NOW", "FIX SOON"],
                                      state="readonly", width=10,
                                      font=(FONT_FAMILY, 10))
        priority_combo.pack(side="left", padx=(8, 0))

        # Property/folder selector row (to associate note with specific report)
        property_row = tk.Frame(notes_card, bg=BG_CARD)
        property_row.pack(fill="x", pady=(0, 8))

        tk.Label(property_row, text="For property:",
                font=(FONT_FAMILY, 10),
                fg=TEXT_SECONDARY, bg=BG_CARD).pack(side="left")

        self.note_property_var = tk.StringVar(value="(Add a folder first)")
        self.note_property_combo = ttk.Combobox(property_row, textvariable=self.note_property_var,
                                                 values=["(Add a folder first)"],
                                                 state="readonly", width=40,
                                                 font=(FONT_FAMILY, 10))
        self.note_property_combo.pack(side="left", padx=(8, 0), fill="x", expand=True)

        # Note text entry
        note_entry_frame = tk.Frame(notes_card, bg=BG_SECONDARY)
        note_entry_frame.pack(fill="x", pady=(0, 8))

        self.note_text = tk.Text(note_entry_frame, height=2,
                                 font=(FONT_FAMILY, 11),
                                 bg=BG_SECONDARY, fg=TEXT_PRIMARY,
                                 insertbackground=TEXT_PRIMARY,
                                 relief="flat", padx=8, pady=8,
                                 wrap="word")
        self.note_text.pack(fill="x")

        # Visual focus indicators
        self.note_text.bind("<FocusIn>", lambda e: self.note_text.config(relief="solid"))
        self.note_text.bind("<FocusOut>", lambda e: self.note_text.config(relief="flat"))

        # Add Note button
        add_note_btn = self._create_action_button(notes_card, "+ Add Note", self._add_note)
        add_note_btn.pack(anchor="w", pady=(0, 8))

        # Notes list display area (hidden initially)
        self.notes_list_frame = tk.Frame(notes_card, bg=BG_CARD)
        self.notes_list_frame.pack(fill="x")
        self.notes_list_frame.pack_forget()

        # Canvas for scrolling notes
        self.notes_canvas = tk.Canvas(self.notes_list_frame, bg=BG_SECONDARY,
                                      highlightthickness=0, height=60)
        self.notes_canvas.pack(side="left", fill="both", expand=True)

        # Scrollbar
        self.notes_scrollbar = tk.Scrollbar(self.notes_list_frame, orient="vertical",
                                            command=self.notes_canvas.yview)
        self.notes_scrollbar.pack(side="right", fill="y")
        self.notes_canvas.configure(yscrollcommand=self.notes_scrollbar.set)

        # Inner frame for notes content
        self.notes_inner_frame = tk.Frame(self.notes_canvas, bg=BG_SECONDARY)
        self.notes_canvas_window = self.notes_canvas.create_window((0, 0),
                                                                    window=self.notes_inner_frame,
                                                                    anchor="nw")

        # Bind canvas resize for notes
        self.notes_inner_frame.bind("<Configure>", self._on_notes_configure)
        self.notes_canvas.bind("<Configure>", self._on_notes_canvas_configure)
        self.notes_canvas.bind("<MouseWheel>", self._on_notes_mousewheel)
        self.notes_inner_frame.bind("<MouseWheel>", self._on_notes_mousewheel)

        # ===== GENERATE BUTTON =====
        self.generate_btn = tk.Frame(main, bg=ACCENT, cursor="hand2", takefocus=False)
        self.generate_btn.pack(fill="x", pady=(8, 8), ipady=12)

        self.generate_label = tk.Label(self.generate_btn, text="Generate Reports",
                                       font=(FONT_FAMILY, 14, 'bold'),
                                       fg=TEXT_PRIMARY, bg=ACCENT, takefocus=False)
        self.generate_label.pack()

        # Bind click and hover
        for widget in [self.generate_btn, self.generate_label]:
            widget.bind("<Button-1>", self._on_button_click)
            widget.bind("<Enter>", lambda e: self._btn_hover(True))
            widget.bind("<Leave>", lambda e: self._btn_hover(False))

        # ===== PROGRESS SECTION =====
        progress_card = self._create_card(main)
        progress_card.pack(fill="x", pady=(0, 8))

        # Progress header
        progress_header = tk.Frame(progress_card, bg=BG_CARD)
        progress_header.pack(fill="x", pady=(0, 6))

        tk.Label(progress_header, text="Progress",
                font=(FONT_FAMILY, 13, 'bold'),
                fg=TEXT_PRIMARY, bg=BG_CARD).pack(side="left")

        self.progress_percent = tk.Label(progress_header, text="0%",
                                        font=(FONT_FAMILY, 12, 'bold'),
                                        fg=ACCENT, bg=BG_CARD)
        self.progress_percent.pack(side="right")

        # Custom progress bar frame
        progress_bg = tk.Frame(progress_card, bg=BG_SECONDARY, height=6)
        progress_bg.pack(fill="x", pady=(0, 6))
        progress_bg.pack_propagate(False)

        self.progress_fill = tk.Frame(progress_bg, bg=ACCENT, height=6)
        self.progress_fill.place(x=0, y=0, relheight=1, relwidth=0)

        # Status label
        self.status_label = tk.Label(progress_card, text="Ready",
                                    font=(FONT_FAMILY, 11),
                                    fg=SUCCESS, bg=BG_CARD, anchor="w")
        self.status_label.pack(fill="x")

        # Log label
        self.log_label = tk.Label(progress_card, text="Add files to begin",
                                 font=(FONT_FAMILY, 10),
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
        card = tk.Frame(parent, bg=BG_CARD, padx=20, pady=12)
        return card

    def _create_action_button(self, parent, text, command):
        """Create an action button"""
        btn = tk.Label(parent, text=text,
                      font=(FONT_FAMILY, 10, 'bold'),
                      fg=ACCENT, bg=BG_CARD,
                      cursor="hand2", padx=8, pady=4, takefocus=False)
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

    def _on_notes_configure(self, event):
        """Update scroll region when notes content changes"""
        self.notes_canvas.configure(scrollregion=self.notes_canvas.bbox("all"))

    def _on_notes_canvas_configure(self, event):
        """Update inner frame width when notes canvas resizes"""
        self.notes_canvas.itemconfig(self.notes_canvas_window, width=event.width)

    def _on_notes_mousewheel(self, event):
        """Handle mouse wheel scrolling on the notes list"""
        self.notes_canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")

    def _add_note(self):
        """Add an inspector note to the list"""
        text = self.note_text.get("1.0", "end-1c").strip()
        if not text:
            messagebox.showwarning("Empty Note", "Please enter a note before adding.")
            return

        # Check that a property is selected
        property_name = self.note_property_var.get()
        if property_name == "(Add a folder first)" or not self.sources:
            messagebox.showwarning("No Property", "Please add a photo folder first, then select which property this note is for.")
            return

        note = {
            "text": text,
            "responsibility": self.responsibility_var.get(),
            "priority": self.priority_var.get(),
            "property": property_name  # Associate note with specific property/folder
        }
        self.inspector_notes.append(note)
        print(f"[DEBUG UI] Added note: {note}")
        print(f"[DEBUG UI] Total notes: {len(self.inspector_notes)}")

        # Clear the text entry
        self.note_text.delete("1.0", "end")

        # Update the display
        self._update_notes_list()

    def _delete_note(self, index):
        """Delete a note from the list"""
        if 0 <= index < len(self.inspector_notes):
            del self.inspector_notes[index]
            self._update_notes_list()

    def _update_notes_list(self):
        """Update the notes list display"""
        # Clear existing notes
        for widget in self.notes_inner_frame.winfo_children():
            widget.destroy()

        if not self.inspector_notes:
            self.notes_list_frame.pack_forget()
            self.notes_count_label.config(text="")
            return

        # Show the notes list
        self.notes_list_frame.pack(fill="x")
        self.notes_count_label.config(text=f"{len(self.inspector_notes)} note{'s' if len(self.inspector_notes) != 1 else ''}")

        # Add each note
        for i, note in enumerate(self.inspector_notes):
            note_frame = tk.Frame(self.notes_inner_frame, bg=BG_SECONDARY)
            note_frame.pack(fill="x", padx=8, pady=(4 if i == 0 else 2, 4 if i == len(self.inspector_notes) - 1 else 0))

            # Note content row
            content_row = tk.Frame(note_frame, bg=BG_SECONDARY)
            content_row.pack(fill="x")

            # Tags
            resp_color = ACCENT if note["responsibility"] == "OWNER" else SUCCESS
            priority_color = ERROR if note["priority"] == "FIX NOW" else TEXT_SECONDARY

            tk.Label(content_row, text=f"[{note['responsibility']}]",
                    font=(FONT_FAMILY, 9, 'bold'),
                    fg=resp_color, bg=BG_SECONDARY).pack(side="left")

            tk.Label(content_row, text=f" [{note['priority']}]",
                    font=(FONT_FAMILY, 9),
                    fg=priority_color, bg=BG_SECONDARY).pack(side="left")

            # Property name (which folder this note belongs to)
            property_name = note.get("property", "")
            if property_name:
                tk.Label(content_row, text=f"  📁 {property_name}",
                        font=(FONT_FAMILY, 9),
                        fg=TEXT_MUTED, bg=BG_SECONDARY).pack(side="left")

            # Delete button
            delete_btn = tk.Label(content_row, text="×",
                                 font=(FONT_FAMILY, 12, 'bold'),
                                 fg=TEXT_MUTED, bg=BG_SECONDARY, cursor="hand2", takefocus=False)
            delete_btn.pack(side="right", padx=(8, 0))
            # Use default argument to capture current index
            delete_btn.bind("<Button-1>", lambda e, idx=i: self._delete_note(idx))
            delete_btn.bind("<Enter>", lambda e, btn=delete_btn: btn.config(fg=ERROR))
            delete_btn.bind("<Leave>", lambda e, btn=delete_btn: btn.config(fg=TEXT_MUTED))

            # Note text (truncated if too long)
            text_display = note["text"]
            if len(text_display) > 60:
                text_display = text_display[:57] + "..."

            tk.Label(note_frame, text=text_display,
                    font=(FONT_FAMILY, 10),
                    fg=TEXT_SECONDARY, bg=BG_SECONDARY,
                    anchor="w").pack(fill="x", pady=(2, 0))

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
                self._update_property_dropdown()  # Update property selector for notes
            else:
                messagebox.showwarning("No Photos", "No image files found in folder.")

    def _count_images(self, folder):
        count = 0
        for ext in IMAGE_EXTENSIONS:
            count += len(list(Path(folder).rglob(f"*{ext}")))
            count += len(list(Path(folder).rglob(f"*{ext.upper()}")))
        return count

    def _update_property_dropdown(self):
        """Update the property/folder selector dropdown for notes"""
        if not self.sources:
            self.note_property_combo['values'] = ["(Add a folder first)"]
            self.note_property_var.set("(Add a folder first)")
            return

        options = []
        for source_path, source_type in self.sources:
            # Show folder name for display
            name = Path(source_path).name
            options.append(name)

        self.note_property_combo['values'] = options
        # Select first option by default
        if options:
            self.note_property_var.set(options[0])

    def _clear_sources(self):
        self.sources = []
        self._update_file_count()
        self._update_property_dropdown()  # Reset property selector

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
                    font=(FONT_FAMILY, 10),
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

        # Serialize notes to JSON for passing to subprocess
        notes_json = json.dumps(self.inspector_notes) if self.inspector_notes else "[]"
        print(f"[DEBUG UI] inspector_notes list has {len(self.inspector_notes)} items")
        print(f"[DEBUG UI] notes_json = {notes_json}")

        thread = threading.Thread(target=self._run_reports,
                                 args=(self.sources.copy(), inspector, notes_json))
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

    def _run_reports(self, sources, inspector, all_notes_json):
        total = len(sources)
        generated = []

        # Parse the full notes list once
        try:
            all_notes = json.loads(all_notes_json) if all_notes_json else []
        except json.JSONDecodeError:
            all_notes = []

        for i, (source_path, source_type) in enumerate(sources, 1):
            name = Path(source_path).name
            self.output_queue.put(('log', f"Processing {name}..."))
            self.output_queue.put(('progress', (i - 1) / total * 100))

            try:
                if source_type == 'zip':
                    cmd = [sys.executable, "run_report.py", "--zip", source_path, "--client", inspector]
                else:
                    cmd = [sys.executable, "run_report.py", "--dir", source_path, "--client", inspector]

                # Filter notes for this specific property (folder name)
                property_notes = [n for n in all_notes if n.get("property") == name]
                if property_notes:
                    notes_json = json.dumps(property_notes)
                    cmd.extend(["--notes", notes_json])
                    print(f"[DEBUG UI] Passing {len(property_notes)} notes for {name}: {notes_json}")

                process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                          text=True, cwd=str(Path(__file__).parent),
                                          encoding='utf-8', errors='replace')

                for line in iter(process.stdout.readline, ''):
                    line = line.strip()
                    if line:
                        # Print debug lines to terminal for troubleshooting
                        if "[DEBUG" in line:
                            print(line)
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
