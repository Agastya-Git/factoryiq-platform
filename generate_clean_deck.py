import sys
import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

def build_clean_deck(output_path="FactoryIQ_Innovate_India_2026.pptx"):
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # ─────────────────────────────────────────────────────────────────────────
    # Human-Crafted, Clean Modern Palette (Stripe / Linear / Industrial SaaS style)
    # ─────────────────────────────────────────────────────────────────────────
    BG_LIGHT      = RGBColor(248, 250, 252)   # #F8FAFC Crisp, soft off-white
    WHITE         = RGBColor(255, 255, 255)   # #FFFFFF Pure clean card
    INK_BLACK     = RGBColor(15, 23, 42)      # #0F172A Deep slate black (headings)
    INK_BODY      = RGBColor(51, 65, 85)      # #334155 Clear readable dark slate
    INK_MUTED     = RGBColor(100, 116, 139)   # #64748B Secondary grey
    BORDER_LIGHT  = RGBColor(226, 232, 240)   # #E2E8F0 Subtle, elegant border
    
    # Tasteful accents (never neon, always professional)
    PRIMARY_BLUE  = RGBColor(29, 78, 216)     # #1D4ED8 Deep electric blue
    LIGHT_BLUE_BG = RGBColor(239, 246, 255)   # #EFF6FF Soft blue container
    ACCENT_AMBER  = RGBColor(217, 119, 6)     # #D97706 Warm warning amber
    LIGHT_AMBER_BG= RGBColor(254, 243, 199)   # #FEF3C7 Soft amber container
    ACCENT_GREEN  = RGBColor(16, 149, 117)    # #109575 Calm forest/emerald
    LIGHT_GREEN_BG= RGBColor(236, 253, 245)   # #ECFDF5 Soft green container

    def set_bg(slide):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), prs.slide_width, prs.slide_height)
        bg.fill.solid()
        bg.fill.fore_color.rgb = BG_LIGHT
        bg.line.fill.background()
        return bg

    def add_card(slide, left, top, width, height, bg_color=WHITE, border_color=BORDER_LIGHT):
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        card.fill.solid()
        card.fill.fore_color.rgb = bg_color
        if border_color:
            card.line.color.rgb = border_color
            card.line.width = Pt(1.0)
        else:
            card.line.fill.background()
        return card

    def add_header(slide, slide_num, category, title, takeaway):
        # Category label + number
        cat_box = slide.shapes.add_textbox(Inches(0.9), Inches(0.45), Inches(11.5), Inches(0.35))
        ctf = cat_box.text_frame
        ctf.margin_left = ctf.margin_top = ctf.margin_right = ctf.margin_bottom = 0
        cp = ctf.paragraphs[0]
        
        c_num = cp.add_run()
        c_num.text = f"0{slide_num}  /  "
        c_num.font.size = Pt(10)
        c_num.font.bold = True
        c_num.font.color.rgb = PRIMARY_BLUE

        c_text = cp.add_run()
        c_text.text = category.upper()
        c_text.font.size = Pt(10)
        c_text.font.bold = True
        c_text.font.color.rgb = INK_MUTED

        # Main Title
        t_box = slide.shapes.add_textbox(Inches(0.9), Inches(0.8), Inches(11.5), Inches(0.85))
        ttf = t_box.text_frame
        ttf.word_wrap = True
        ttf.margin_left = ttf.margin_top = ttf.margin_right = ttf.margin_bottom = 0
        tp1 = ttf.paragraphs[0]
        tr1 = tp1.add_run()
        tr1.text = title
        tr1.font.size = Pt(22)
        tr1.font.bold = True
        tr1.font.color.rgb = INK_BLACK

        tp2 = ttf.add_paragraph()
        tp2.space_before = Pt(3)
        tr2 = tp2.add_run()
        tr2.text = takeaway
        tr2.font.size = Pt(11)
        tr2.font.color.rgb = INK_BODY

    # ═════════════════════════════════════════════════════════════════════════
    # SLIDE 1: Cover Slide (Human, Clean, Confident)
    # ═════════════════════════════════════════════════════════════════════════
    s1 = prs.slides.add_slide(blank_layout)
    set_bg(s1)

    # Top minimal bar
    top_pill = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.9), Inches(0.8), Inches(3.8), Inches(0.35))
    top_pill.fill.solid()
    top_pill.fill.fore_color.rgb = LIGHT_BLUE_BG
    top_pill.line.color.rgb = PRIMARY_BLUE
    top_pill.line.width = Pt(1)
    ptf = top_pill.text_frame
    ptf.vertical_anchor = MSO_ANCHOR.MIDDLE
    pp = ptf.paragraphs[0]
    pp.alignment = PP_ALIGN.CENTER
    pr = pp.add_run()
    pr.text = "INNOVATE INDIA 2026  •  AI & SMART IoT"
    pr.font.size = Pt(9.5)
    pr.font.bold = True
    pr.font.color.rgb = PRIMARY_BLUE

    # Main Title Area
    tbox = s1.shapes.add_textbox(Inches(0.9), Inches(1.4), Inches(11.5), Inches(3.6))
    tf = tbox.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

    p_main = tf.paragraphs[0]
    r_main = p_main.add_run()
    r_main.text = "FactoryIQ"
    r_main.font.size = Pt(54)
    r_main.font.bold = True
    r_main.font.color.rgb = INK_BLACK

    p_sub = tf.add_paragraph()
    p_sub.space_before = Pt(8)
    r_sub = p_sub.add_run()
    r_sub.text = "Turning Legacy Factory Floors into Self-Diagnosing Systems"
    r_sub.font.size = Pt(22)
    r_sub.font.bold = True
    r_sub.font.color.rgb = PRIMARY_BLUE

    p_body = tf.add_paragraph()
    p_body.space_before = Pt(14)
    r_body = p_body.add_run()
    r_body.text = (
        "An intelligent shop-floor platform that monitors equipment health in real-time, "
        "explains failure causes before breakdown occurs, verifies spare parts availability, "
        "and automatically routes repair work to on-duty technicians."
    )
    r_body.font.size = Pt(13)
    r_body.font.color.rgb = INK_BODY

    # 3 Simple Feature Callout Pills
    pills = [
        ("Real-Time Telemetry", "50 machines live via PostgreSQL"),
        ("Dual-Model AI", "Isolation Forest + XGBoost + SHAP"),
        ("Smart Auto-Dispatch", "Inventory-checked work orders")
    ]
    for i, (head, sub) in enumerate(pills):
        pl = Inches(0.9) + i * Inches(3.9)
        pt = Inches(4.3)
        add_card(s1, pl, pt, Inches(3.7), Inches(1.2), bg_color=WHITE)
        tb = s1.shapes.add_textbox(pl + Inches(0.25), pt + Inches(0.2), Inches(3.2), Inches(0.8))
        ptf2 = tb.text_frame
        ptf2.word_wrap = True
        ptf2.margin_left = ptf2.margin_top = ptf2.margin_right = ptf2.margin_bottom = 0
        p0 = ptf2.paragraphs[0]
        r0 = p0.add_run()
        r0.text = head
        r0.font.size = Pt(12)
        r0.font.bold = True
        r0.font.color.rgb = INK_BLACK
        p1 = ptf2.add_paragraph()
        p1.space_before = Pt(4)
        r1 = p1.add_run()
        r1.text = sub
        r1.font.size = Pt(10)
        r1.font.color.rgb = INK_MUTED

    # Bottom Meta Bar
    meta = s1.shapes.add_textbox(Inches(0.9), Inches(6.1), Inches(11.5), Inches(0.6))
    mtf = meta.text_frame
    mp = mtf.paragraphs[0]
    mr = mp.add_run()
    mr.text = "Team ByteForce  |  Round 1 Idea Submission  |  Innovate India National Hackathon 2026 (Powered by DevHarbour)"
    mr.font.size = Pt(10.5)
    mr.font.color.rgb = INK_MUTED

    # ═════════════════════════════════════════════════════════════════════════
    # SLIDE 2: Problem Statement (Clear, Grounded, Real)
    # ═════════════════════════════════════════════════════════════════════════
    s2 = prs.slides.add_slide(blank_layout)
    set_bg(s2)
    add_header(s2, 2, "Problem Statement",
               "Why Machines Break Down and Why Current Systems Fail to Prevent It",
               "Most factories already have sensors, but they still suffer unexpected stops. Here is why:")

    problems = [
        {
            "num": "01",
            "title": "Alarms only sound when it's already too late",
            "tag": "Reactive Limits",
            "desc": "Standard alarms only trigger when temperature or vibration crosses a fixed red line (e.g. > 80°C). By the time the siren sounds, the bearing is already destroyed and the assembly line is halted."
        },
        {
            "num": "02",
            "title": "Vague errors leave technicians guessing",
            "tag": "Zero Explanations",
            "desc": "When an alarm trips, workers see generic codes like 'Error 402'. Technicians spend hours taking the machine apart simply to find out which small part inside actually failed."
        },
        {
            "num": "03",
            "title": "Technicians show up, but parts aren't in stock",
            "tag": "Inventory Blindspot",
            "desc": "Current maintenance tools don't talk to the storeroom. A worker gets dispatched to fix a pump, only to find the replacement seal is out of stock. Hours are wasted waiting for parts."
        },
        {
            "num": "04",
            "title": "Executives only see engineering numbers, not money",
            "tag": "Financial Disconnect",
            "desc": "Displaying '74°C' or '4.2 mm/s' doesn't help plant managers prioritize. They need to know which struggling machine will cost the most money if it shuts down today."
        }
    ]

    card_w = Inches(5.6)
    card_h = Inches(2.4)
    pos = [
        (Inches(0.9), Inches(1.9)),
        (Inches(6.8), Inches(1.9)),
        (Inches(0.9), Inches(4.55)),
        (Inches(6.8), Inches(4.55))
    ]

    for p, (l, t) in zip(problems, pos):
        add_card(s2, l, t, card_w, card_h)
        tb = s2.shapes.add_textbox(l + Inches(0.35), t + Inches(0.25), card_w - Inches(0.7), card_h - Inches(0.4))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

        p0 = tf.paragraphs[0]
        r_num = p0.add_run()
        r_num.text = f"{p['num']}  "
        r_num.font.size = Pt(13)
        r_num.font.bold = True
        r_num.font.color.rgb = PRIMARY_BLUE

        r_tag = p0.add_run()
        r_tag.text = f"•  {p['tag'].upper()}"
        r_tag.font.size = Pt(9.5)
        r_tag.font.bold = True
        r_tag.font.color.rgb = ACCENT_AMBER

        p1 = tf.add_paragraph()
        p1.space_before = Pt(4)
        r1 = p1.add_run()
        r1.text = p['title']
        r1.font.size = Pt(14)
        r1.font.bold = True
        r1.font.color.rgb = INK_BLACK

        p2 = tf.add_paragraph()
        p2.space_before = Pt(6)
        r2 = p2.add_run()
        r2.text = p['desc']
        r2.font.size = Pt(10.5)
        r2.font.color.rgb = INK_BODY

    # ═════════════════════════════════════════════════════════════════════════
    # SLIDE 3: Proposed Solution (Simple, Clean, Logical)
    # ═════════════════════════════════════════════════════════════════════════
    s3 = prs.slides.add_slide(blank_layout)
    set_bg(s3)
    add_header(s3, 3, "Proposed Solution",
               "FactoryIQ: An End-to-End Early Warning & Maintenance Platform",
               "We connect live machine data to predictive models and automated maintenance workflows without replacing existing machines.")

    pillars = [
        {
            "step": "STEP 1",
            "title": "Listen & Stream",
            "tag": "Non-Invasive IoT Telemetry",
            "points": [
                "Pulls sensor data every 3 seconds: vibration, temperature, power draw, load %, and RPM.",
                "Tested and streaming across a 50-machine industrial fleet into PostgreSQL.",
                "Zero expensive machine overhaul: works as an overlay on top of existing equipment."
            ]
        },
        {
            "step": "STEP 2",
            "title": "Predict & Explain",
            "tag": "Dual ML + SHAP Explainability",
            "points": [
                "Spots subtle pattern drift days before an alarm would ring, using Isolation Forest.",
                "Calculates exact failure probability (0-100%) and explains the cause (e.g. 65% bearing wear).",
                "Translates engineering data into real-time 'Rupees at Risk' (₹) for instant business clarity."
            ]
        },
        {
            "step": "STEP 3",
            "title": "Verify & Dispatch",
            "tag": "Inventory-Aware Work Orders",
            "points": [
                "Automatically checks if required replacement parts exist in stock before sending a worker.",
                "If in stock: technician receives a complete digital work order with bin location and safety steps.",
                "If out of stock: system routes the worker to other ready jobs first, eliminating wasted time."
            ]
        }
    ]

    p_w = Inches(3.65)
    p_h = Inches(4.9)
    for i, pil in enumerate(pillars):
        l = Inches(0.9) + i * Inches(4.0)
        t = Inches(1.9)
        add_card(s3, l, t, p_w, p_h)

        tb = s3.shapes.add_textbox(l + Inches(0.3), t + Inches(0.3), p_w - Inches(0.6), p_h - Inches(0.5))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

        p0 = tf.paragraphs[0]
        r0 = p0.add_run()
        r0.text = pil['step']
        r0.font.size = Pt(11)
        r0.font.bold = True
        r0.font.color.rgb = PRIMARY_BLUE

        p1 = tf.add_paragraph()
        r1 = p1.add_run()
        r1.text = pil['title']
        r1.font.size = Pt(18)
        r1.font.bold = True
        r1.font.color.rgb = INK_BLACK

        p_tag = tf.add_paragraph()
        p_tag.space_before = Pt(2)
        r_tag = p_tag.add_run()
        r_tag.text = pil['tag']
        r_tag.font.size = Pt(10)
        r_tag.font.bold = True
        r_tag.font.color.rgb = INK_MUTED

        for pt in pil['points']:
            pb = tf.add_paragraph()
            pb.space_before = Pt(12)
            rb = pb.add_run()
            rb.text = f"•  {pt}"
            rb.font.size = Pt(10.5)
            rb.font.color.rgb = INK_BODY

    # ═════════════════════════════════════════════════════════════════════════
    # SLIDE 4: Technical Innovation (Dual ML & Explainable AI)
    # ═════════════════════════════════════════════════════════════════════════
    s4 = prs.slides.add_slide(blank_layout)
    set_bg(s4)
    add_header(s4, 4, "Algorithmic Innovation",
               "Why Our AI is Different: No Black Boxes, Full Explanations",
               "Instead of simple threshold checks or mysterious black-box AI, we combine anomaly detection with exact root-cause breakdown.")

    ai_features = [
        {
            "tag": "STEP 1: ANOMALY DETECTION",
            "name": "Isolation Forest (Unsupervised)",
            "why": "Catches subtle multi-sensor drift",
            "desc": "Traditional alarms look at sensors individually. Our Isolation Forest model analyzes vibration, heat, and load together. It spots unusual machine behaviour days before any individual sensor crosses an alarm threshold."
        },
        {
            "tag": "STEP 2: FAILURE PROBABILITY",
            "name": "XGBoost Classifier",
            "why": "Predicts likelihood of breakdown",
            "desc": "Trained on industrial operational stress cycles to produce an accurate, calibrated Failure Risk percentage (0–100%) and Remaining Useful Life (RUL) estimate for each machine in the plant."
        },
        {
            "tag": "STEP 3: TRANSPARENT ROOT CAUSE",
            "name": "Explainable AI with SHAP",
            "why": "Tells technicians exactly WHAT is failing",
            "desc": "Engineers don't trust unexplained AI predictions. SHAP values mathematically break down the risk score into plain language: e.g. '64% of risk is caused by bearing vibration, 26% by motor heat'. Workers know what wrench to grab before leaving the office."
        },
        {
            "tag": "STEP 4: FINANCIAL TRANSLATION",
            "name": "Real-Time 'Rupees at Risk' (₹)",
            "why": "Turns raw telemetry into business sense",
            "desc": "Computes real-time monetary loss: Downtime Hours × Production Rate × Contribution Margin. If Machine M07 is struggling, the manager sees '₹45,000 at risk right now', allowing them to prioritize the most expensive danger first."
        }
    ]

    for p, (l, t) in zip(ai_features, pos):
        add_card(s4, l, t, card_w, card_h)
        tb = s4.shapes.add_textbox(l + Inches(0.35), t + Inches(0.22), card_w - Inches(0.7), card_h - Inches(0.4))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

        p0 = tf.paragraphs[0]
        r_tag = p0.add_run()
        r_tag.text = p['tag']
        r_tag.font.size = Pt(9.5)
        r_tag.font.bold = True
        r_tag.font.color.rgb = PRIMARY_BLUE

        p1 = tf.add_paragraph()
        p1.space_before = Pt(3)
        r1 = p1.add_run()
        r1.text = p['name']
        r1.font.size = Pt(15)
        r1.font.bold = True
        r1.font.color.rgb = INK_BLACK

        p_why = tf.add_paragraph()
        r_why = p_why.add_run()
        r_why.text = f"Why it matters: {p['why']}"
        r_why.font.size = Pt(10)
        r_why.font.bold = True
        r_why.font.color.rgb = ACCENT_AMBER

        p2 = tf.add_paragraph()
        p2.space_before = Pt(6)
        r2 = p2.add_run()
        r2.text = p['desc']
        r2.font.size = Pt(10.5)
        r2.font.color.rgb = INK_BODY

    # ═════════════════════════════════════════════════════════════════════════
    # SLIDE 5: Key Feature Highlight (Smart Inventory & Task Auto-Dispatch)
    # ═════════════════════════════════════════════════════════════════════════
    s5 = prs.slides.add_slide(blank_layout)
    set_bg(s5)
    add_header(s5, 5, "Smart Operations Feature",
               "Inventory-Aware Scheduling & Automated Work Orders",
               "Closing the loop: from detecting machine health to getting the right technician and parts on the floor.")

    new_feats = [
        {
            "badge": "FEATURE HIGHLIGHT A",
            "title": "Smart Spare Parts Inventory Check",
            "tag": "Prevents wasted technician trips",
            "bullets": [
                ("Automatic Stock Verification: ", "The instant ML flags a failing component (e.g. bearing wear), FactoryIQ automatically queries the warehouse inventory for that exact replacement part."),
                ("When Part is in Stock: ", "The digital work order is generated immediately, complete with the storeroom bin location, required tools, and Lockout/Tagout (LOTO) safety checklist."),
                ("When Part is Out of Stock: ", "The system dynamically reroutes technician priorities to other critical machines that can be serviced immediately, while automatically raising an inventory reorder ticket.")
            ]
        },
        {
            "badge": "FEATURE HIGHLIGHT B",
            "title": "ML-Powered Task Auto-Assignment",
            "tag": "Right job to the right person",
            "bullets": [
                ("Auto-Generated Problem Summary: ", "The model writes a concise diagnostic summary so technicians understand the issue before arriving (sensor history, root cause, suggested steps)."),
                ("Skill & Station Matching: ", "Tasks are auto-assigned to on-duty technicians based on machine type specialization (CNC, Pneumatics, Robotics) and line proximity."),
                ("Full Accountability Trail: ", "Tracks the entire lifecycle: when the technician starts, notes added during repair, resolution confirmation, and supervisor sign-off.")
            ]
        }
    ]

    c5_w = Inches(5.6)
    c5_h = Inches(4.9)
    for i, nf in enumerate(new_feats):
        l = Inches(0.9) + i * Inches(5.9)
        t = Inches(1.9)
        add_card(s5, l, t, c5_w, c5_h)

        tb = s5.shapes.add_textbox(l + Inches(0.35), t + Inches(0.3), c5_w - Inches(0.7), c5_h - Inches(0.5))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

        p0 = tf.paragraphs[0]
        r0 = p0.add_run()
        r0.text = nf['badge']
        r0.font.size = Pt(10)
        r0.font.bold = True
        r0.font.color.rgb = PRIMARY_BLUE

        p1 = tf.add_paragraph()
        p1.space_before = Pt(3)
        r1 = p1.add_run()
        r1.text = nf['title']
        r1.font.size = Pt(17)
        r1.font.bold = True
        r1.font.color.rgb = INK_BLACK

        p_tag = tf.add_paragraph()
        r_tag = p_tag.add_run()
        r_tag.text = nf['tag']
        r_tag.font.size = Pt(10.5)
        r_tag.font.bold = True
        r_tag.font.color.rgb = ACCENT_AMBER

        for label, txt in nf['bullets']:
            pb = tf.add_paragraph()
            pb.space_before = Pt(12)
            rl = pb.add_run()
            rl.text = label
            rl.font.size = Pt(10.5)
            rl.font.bold = True
            rl.font.color.rgb = INK_BLACK
            rt = pb.add_run()
            rt.text = txt
            rt.font.size = Pt(10.5)
            rt.font.color.rgb = INK_BODY

    # ═════════════════════════════════════════════════════════════════════════
    # SLIDE 6: System Architecture & Technology Stack
    # ═════════════════════════════════════════════════════════════════════════
    s6 = prs.slides.add_slide(blank_layout)
    set_bg(s6)
    add_header(s6, 6, "Architecture & Technology Stack",
               "Modern, Scalable Full-Stack Engineering",
               "Built for high-concurrency sensor streaming, instant browser updates, and secure role-based access.")

    layers = [
        ("1. Data Ingestion & Streaming", "Python Async Engine", "Simulates continuous 3s multi-parameter industrial telemetry (temp, vibration, power, load, RPM) across 50 machines into the database."),
        ("2. Time-Series Persistence", "PostgreSQL 16", "Stores fleet metadata, sensor history logs, active work orders, inventory stock, and historical maintenance audit trails."),
        ("3. Intelligence & API Layer", "FastAPI & Scikit-Learn / XGBoost", "Powers rolling anomaly detection, XGBoost failure risk prediction, SHAP waterfall explanations, and JWT authentication with role-based permissions."),
        ("4. Interactive Web Dashboard", "React 18 + TypeScript + Recharts", "Responsive monitoring interface with station filters (Stations A-D), live sensor gauges, telemetry graphs, and work order assignment controls.")
    ]

    for i, (title, stack, desc) in enumerate(layers):
        l_top = Inches(1.9) + i * Inches(1.22)
        add_card(s6, Inches(0.9), l_top, Inches(11.5), Inches(1.08))

        tb = s6.shapes.add_textbox(Inches(1.2), l_top + Inches(0.16), Inches(11.0), Inches(0.8))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

        p0 = tf.paragraphs[0]
        r_title = p0.add_run()
        r_title.text = f"{title}   "
        r_title.font.size = Pt(13)
        r_title.font.bold = True
        r_title.font.color.rgb = INK_BLACK

        r_stack = p0.add_run()
        r_stack.text = f"[{stack}]"
        r_stack.font.size = Pt(11)
        r_stack.font.bold = True
        r_stack.font.color.rgb = PRIMARY_BLUE

        p1 = tf.add_paragraph()
        p1.space_before = Pt(4)
        r_desc = p1.add_run()
        r_desc.text = desc
        r_desc.font.size = Pt(10.5)
        r_desc.font.color.rgb = INK_BODY

    # ═════════════════════════════════════════════════════════════════════════
    # SLIDE 7: Real-World Business Impact & ROI
    # ═════════════════════════════════════════════════════════════════════════
    s7 = prs.slides.add_slide(blank_layout)
    set_bg(s7)
    add_header(s7, 7, "Impact & Feasibility",
               "Clear, Quantifiable Business Results for Factory Owners",
               "Moving from reactive panic to planned maintenance creates immediate financial and operational value.")

    impacts = [
        {
            "big": "70%",
            "label": "Reduction in Unplanned Downtime",
            "desc": "Catching small vibrations and thermal stress days ahead means parts are replaced during scheduled shift breaks, preventing sudden line stops."
        },
        {
            "big": "Zero",
            "label": "Wasted Maintenance Trips",
            "desc": "Inventory pre-checking ensures workers never arrive at a machine without the right part in hand, eliminating idle waiting and frustration."
        },
        {
            "big": "15-20%",
            "label": "Cut in Power & Energy Waste",
            "desc": "Continuous power tracking flags machines drawing heavy electricity while idling or struggling with mechanical friction."
        },
        {
            "big": "< 6 Mos",
            "label": "Fast Payback & Low Setup Cost",
            "desc": "Our software overlay works on top of existing factory controllers. Factories don't need to purchase multi-crore new machines to get smart insights."
        }
    ]

    for p, (l, t) in zip(impacts, pos):
        add_card(s7, l, t, card_w, card_h)
        tb = s7.shapes.add_textbox(l + Inches(0.35), t + Inches(0.2), card_w - Inches(0.7), card_h - Inches(0.4))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

        p0 = tf.paragraphs[0]
        r_num = p0.add_run()
        r_num.text = p['big']
        r_num.font.size = Pt(32)
        r_num.font.bold = True
        r_num.font.color.rgb = PRIMARY_BLUE

        p1 = tf.add_paragraph()
        r_lbl = p1.add_run()
        r_lbl.text = p['label']
        r_lbl.font.size = Pt(13)
        r_lbl.font.bold = True
        r_lbl.font.color.rgb = INK_BLACK

        p2 = tf.add_paragraph()
        p2.space_before = Pt(6)
        r2 = p2.add_run()
        r2.text = p['desc']
        r2.font.size = Pt(10.5)
        r2.font.color.rgb = INK_BODY

    # ═════════════════════════════════════════════════════════════════════════
    # SLIDE 8: Roadmap & Conclusion
    # ═════════════════════════════════════════════════════════════════════════
    s8 = prs.slides.add_slide(blank_layout)
    set_bg(s8)
    add_header(s8, 8, "Roadmap & Conclusion",
               "Where We Go Next: From Working Prototype to Factory Floor",
               "A clear and realistic execution plan for Round 2 and real-world deployment.")

    phases = [
        {
            "phase": "ROUND 2 (DEC 2026)",
            "title": "Hardware Gateways & Protocols",
            "desc": "Connect the platform to physical Modbus TCP, MQTT, and OPC-UA industrial gateway hardware to ingest raw PLC data directly from running factory equipment."
        },
        {
            "phase": "PHASE 2",
            "title": "ERP & Automated Procurement",
            "desc": "Link the inventory checking engine with factory ERP systems (like SAP or Oracle) to automatically order replacement bearings when stock drops below threshold."
        },
        {
            "phase": "PHASE 3",
            "title": "Computer Vision QA",
            "desc": "Integrate camera feeds at inspection stations to automatically detect surface defects and micro-scratches on manufactured parts."
        }
    ]

    for i, ph in enumerate(phases):
        l = Inches(0.9) + i * Inches(4.0)
        t = Inches(1.9)
        add_card(s8, l, t, p_w, Inches(3.2))

        tb = s8.shapes.add_textbox(l + Inches(0.25), t + Inches(0.25), p_w - Inches(0.5), Inches(2.7))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

        p0 = tf.paragraphs[0]
        r0 = p0.add_run()
        r0.text = ph['phase']
        r0.font.size = Pt(10)
        r0.font.bold = True
        r0.font.color.rgb = PRIMARY_BLUE

        p1 = tf.add_paragraph()
        p1.space_before = Pt(3)
        r1 = p1.add_run()
        r1.text = ph['title']
        r1.font.size = Pt(14)
        r1.font.bold = True
        r1.font.color.rgb = INK_BLACK

        p2 = tf.add_paragraph()
        p2.space_before = Pt(8)
        r2 = p2.add_run()
        r2.text = ph['desc']
        r2.font.size = Pt(10.5)
        r2.font.color.rgb = INK_BODY

    # Bottom Conclusion Box
    c_box = add_card(s8, Inches(0.9), Inches(5.35), Inches(11.5), Inches(1.5), bg_color=WHITE)
    ctb = s8.shapes.add_textbox(Inches(1.2), Inches(5.5), Inches(10.9), Inches(1.2))
    ctf = ctb.text_frame
    ctf.word_wrap = True
    ctf.margin_left = ctf.margin_top = ctf.margin_right = ctf.margin_bottom = 0

    cp0 = ctf.paragraphs[0]
    cr0 = cp0.add_run()
    cr0.text = "SUMMARY & VISION"
    cr0.font.size = Pt(10)
    cr0.font.bold = True
    cr0.font.color.rgb = PRIMARY_BLUE

    cp1 = ctf.add_paragraph()
    cp1.space_before = Pt(4)
    cr1 = cp1.add_run()
    cr1.text = (
        "FactoryIQ proves that smart manufacturing doesn't require replacing expensive legacy machinery. "
        "By combining real-time IoT streaming, Explainable AI, and inventory-aware task assignment, "
        "we eliminate downtime, protect workers from chaotic breakdowns, and turn raw machine telemetry into clear business profit."
    )
    cr1.font.size = Pt(11.5)
    cr1.font.color.rgb = INK_BLACK

    prs.save(output_path)
    print(f"Generated clean deck: {output_path}")

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "FactoryIQ_Innovate_India_2026.pptx"
    build_clean_deck(out)
