import sys
import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

def build_presentation(output_path="FactoryIQ_Innovate_India_2026.pptx"):
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # Industrial Theme Color Palette
    BG_COLOR      = RGBColor(11, 19, 43)      # #0B132B Deep Industrial Midnight
    CARD_BG       = RGBColor(23, 34, 59)      # #17223B Dark Navy Card
    CARD_BG_ALT   = RGBColor(30, 44, 77)      # #1E2C4D Slightly Lighter Card
    BORDER_COLOR  = RGBColor(45, 68, 110)     # #2D446E Subtle Blue Border
    CYAN          = RGBColor(0, 229, 255)     # #00E5FF High-Tech Cyber Cyan
    BLUE_ACCENT   = RGBColor(58, 134, 255)    # #3A86FF Electric Blue
    AMBER         = RGBColor(255, 170, 0)     # #FFAA00 Industrial Alert / Warning
    EMERALD       = RGBColor(0, 245, 212)     # #00F5D4 Healthy Green
    TEXT_WHITE    = RGBColor(255, 255, 255)   # #FFFFFF Clean White
    TEXT_MUTED    = RGBColor(176, 192, 217)   # #B0C0D9 Readable Light Muted
    TEXT_SECONDARY= RGBColor(210, 225, 245)   # #D2E1F5 Crisp Light Text

    def set_slide_background(slide):
        bg_shape = slide.shapes.add_shape(
            MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), prs.slide_width, prs.slide_height
        )
        bg_shape.fill.solid()
        bg_shape.fill.fore_color.rgb = BG_COLOR
        bg_shape.line.fill.background()
        return bg_shape

    def add_card(slide, left, top, width, height, bg_color=CARD_BG, border_color=BORDER_COLOR):
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        card.fill.solid()
        card.fill.fore_color.rgb = bg_color
        if border_color:
            card.line.color.rgb = border_color
            card.line.width = Pt(1.2)
        else:
            card.line.fill.background()
        return card

    def add_header(slide, slide_num, title, subtitle):
        # Category Badge
        badge = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(0.4), Inches(3.4), Inches(0.32))
        badge.fill.solid()
        badge.fill.fore_color.rgb = RGBColor(18, 30, 56)
        badge.line.color.rgb = CYAN
        badge.line.width = Pt(1.0)
        btf = badge.text_frame
        btf.vertical_anchor = MSO_ANCHOR.MIDDLE
        bp = btf.paragraphs[0]
        bp.alignment = PP_ALIGN.CENTER
        br = bp.add_run()
        br.text = "INNOVATE INDIA 2026 | AI & SMART IoT"
        br.font.size = Pt(9.5)
        br.font.bold = True
        br.font.color.rgb = CYAN

        # Slide Number Badge
        num_badge = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(11.7), Inches(0.4), Inches(0.85), Inches(0.32))
        num_badge.fill.solid()
        num_badge.fill.fore_color.rgb = RGBColor(18, 30, 56)
        num_badge.line.color.rgb = BORDER_COLOR
        num_badge.line.width = Pt(1.0)
        ntf = num_badge.text_frame
        ntf.vertical_anchor = MSO_ANCHOR.MIDDLE
        np = ntf.paragraphs[0]
        np.alignment = PP_ALIGN.CENTER
        nr = np.add_run()
        nr.text = f"0{slide_num} / 08"
        nr.font.size = Pt(9.5)
        nr.font.bold = True
        nr.font.color.rgb = TEXT_MUTED

        # Main Title Box
        tbox = slide.shapes.add_textbox(Inches(0.8), Inches(0.75), Inches(11.8), Inches(0.95))
        ttf = tbox.text_frame
        ttf.word_wrap = True
        ttf.margin_left = ttf.margin_top = ttf.margin_right = ttf.margin_bottom = 0

        p1 = ttf.paragraphs[0]
        r1 = p1.add_run()
        r1.text = title
        r1.font.size = Pt(22)
        r1.font.bold = True
        r1.font.color.rgb = TEXT_WHITE

        p2 = ttf.add_paragraph()
        r2 = p2.add_run()
        r2.text = subtitle
        r2.font.size = Pt(11.5)
        r2.font.color.rgb = TEXT_MUTED

    # =========================================================================
    # SLIDE 1: Title Slide (Cover)
    # =========================================================================
    s1 = prs.slides.add_slide(blank_layout)
    set_slide_background(s1)

    # Decorative tech accent line
    dec_line = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(0.8), Inches(11.733), Inches(0.04))
    dec_line.fill.solid()
    dec_line.fill.fore_color.rgb = CYAN
    dec_line.line.fill.background()

    # Hackathon Banner Tag
    hb = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.1), Inches(4.8), Inches(0.38))
    hb.fill.solid()
    hb.fill.fore_color.rgb = RGBColor(18, 30, 56)
    hb.line.color.rgb = CYAN
    hb.line.width = Pt(1.2)
    hbtf = hb.text_frame
    hbtf.vertical_anchor = MSO_ANCHOR.MIDDLE
    hbp = hbtf.paragraphs[0]
    hbp.alignment = PP_ALIGN.CENTER
    hbr = hbp.add_run()
    hbr.text = "INNOVATE INDIA – NATIONAL HACKATHON 2026"
    hbr.font.size = Pt(10.5)
    hbr.font.bold = True
    hbr.font.color.rgb = CYAN

    # Center Hero Card
    hero = add_card(s1, Inches(0.8), Inches(1.7), Inches(11.733), Inches(4.0), bg_color=CARD_BG, border_color=BORDER_COLOR)

    # Hero Inner Content
    htbox = s1.shapes.add_textbox(Inches(1.3), Inches(2.0), Inches(10.7), Inches(3.4))
    htf = htbox.text_frame
    htf.word_wrap = True
    htf.margin_left = htf.margin_top = htf.margin_right = htf.margin_bottom = 0

    p_tag = htf.paragraphs[0]
    r_tag = p_tag.add_run()
    r_tag.text = "TRACK: ARTIFICIAL INTELLIGENCE & EMERGING TECHNOLOGIES"
    r_tag.font.size = Pt(11)
    r_tag.font.bold = True
    r_tag.font.color.rgb = AMBER

    p_title = htf.add_paragraph()
    r_title = p_title.add_run()
    r_title.text = "FactoryIQ"
    r_title.font.size = Pt(46)
    r_title.font.bold = True
    r_title.font.color.rgb = TEXT_WHITE

    p_sub = htf.add_paragraph()
    r_sub = p_sub.add_run()
    r_sub.text = "Autonomous Industrial Intelligence & Shop-Floor Reliability Platform"
    r_sub.font.size = Pt(20)
    r_sub.font.bold = True
    r_sub.font.color.rgb = CYAN

    p_desc = htf.add_paragraph()
    r_desc = p_desc.add_run()
    r_desc.text = (
        "Transforming legacy manufacturing operations through continuous time-series IoT telemetry, "
        "Explainable AI (SHAP), dynamic downtime risk valuation (₹ at Risk), and intelligent inventory-aware task dispatch."
    )
    r_desc.font.size = Pt(12)
    r_desc.font.color.rgb = TEXT_MUTED

    # Bottom Meta Bar
    meta_box = s1.shapes.add_textbox(Inches(0.8), Inches(6.0), Inches(11.733), Inches(0.9))
    mtf = meta_box.text_frame
    mtf.word_wrap = True

    mp1 = mtf.paragraphs[0]
    mr1 = mp1.add_run()
    mr1.text = "Team ByteForce  |  Innovate. Build. Inspire.  |  Powered by DevHarbour"
    mr1.font.size = Pt(11.5)
    mr1.font.bold = True
    mr1.font.color.rgb = TEXT_SECONDARY

    mp2 = mtf.add_paragraph()
    mr2 = mp2.add_run()
    mr2.text = "Round 1: Comprehensive Project Blueprint & Architecture Presentation"
    mr2.font.size = Pt(10)
    mr2.font.color.rgb = TEXT_MUTED

    # =========================================================================
    # SLIDE 2: Problem Statement
    # =========================================================================
    s2 = prs.slides.add_slide(blank_layout)
    set_slide_background(s2)
    add_header(s2, 2, "The Industrial Dilemma: Why Modern Factories Still Bleed Millions",
               "Traditional operational technology (OT) is reactive, blind to root causes, and disconnected from maintenance execution.")

    problems = [
        {
            "num": "01",
            "title": "The Blind Threshold Trap",
            "tag": "REACTIVE ALARMS",
            "tag_color": AMBER,
            "desc": "Standard SCADA & PLCs only trigger after a hard limit is breached (e.g., Temp > 80°C). By then, bearings have already seized and internal damage has halted the entire assembly line."
        },
        {
            "num": "02",
            "title": "Cryptic 'Black Box' Alarms",
            "tag": "ZERO EXPLAINABILITY",
            "tag_color": CYAN,
            "desc": "Operators receive vague sirens or error codes like 'Fault E-402'. Technicians waste 3–5 hours disassembling complex machinery merely to identify which component actually degraded."
        },
        {
            "num": "03",
            "title": "Inventory & Labor Desynchronization",
            "tag": "DISCONNECTED SILOS",
            "tag_color": AMBER,
            "desc": "Technicians are dispatched without knowing if spare parts (bearings, seals, belts) exist in inventory. If out-of-stock, the machine sits idle while technicians wait, multiplying downtime losses."
        },
        {
            "num": "04",
            "title": "Engineering-to-Business Disconnect",
            "tag": "NO FINANCIAL VISIBILITY",
            "tag_color": CYAN,
            "desc": "Raw sensor telemetry (mm/s vibration, kW power draw) fails to convey urgency. Plant executives lack real-time visibility into the actual monetary risk (₹ at Risk) of unaddressed equipment."
        }
    ]

    card_w = Inches(5.65)
    card_h = Inches(2.4)
    positions = [
        (Inches(0.8), Inches(1.9)),
        (Inches(6.88), Inches(1.9)),
        (Inches(0.8), Inches(4.55)),
        (Inches(6.88), Inches(4.55))
    ]

    for p, (c_left, c_top) in zip(problems, positions):
        add_card(s2, c_left, c_top, card_w, card_h)
        # Inner text
        tb = s2.shapes.add_textbox(c_left + Inches(0.3), c_top + Inches(0.25), card_w - Inches(0.6), card_h - Inches(0.4))
        tf = tb.text_frame
        tf.word_wrap = True

        p0 = tf.paragraphs[0]
        r_num = p0.add_run()
        r_num.text = f"{p['num']}  "
        r_num.font.size = Pt(13)
        r_num.font.bold = True
        r_num.font.color.rgb = p['tag_color']

        r_tag = p0.add_run()
        r_tag.text = f"[{p['tag']}]"
        r_tag.font.size = Pt(9.5)
        r_tag.font.bold = True
        r_tag.font.color.rgb = p['tag_color']

        p1 = tf.add_paragraph()
        r_t = p1.add_run()
        r_t.text = p['title']
        r_t.font.size = Pt(15)
        r_t.font.bold = True
        r_t.font.color.rgb = TEXT_WHITE

        p2 = tf.add_paragraph()
        r_d = p2.add_run()
        r_d.text = p['desc']
        r_d.font.size = Pt(10.5)
        r_d.font.color.rgb = TEXT_MUTED

    # =========================================================================
    # SLIDE 3: Proposed Solution - The FactoryIQ Closed-Loop Architecture
    # =========================================================================
    s3 = prs.slides.add_slide(blank_layout)
    set_slide_background(s3)
    add_header(s3, 3, "Proposed Solution: Autonomous Cyber-Physical Closed-Loop Platform",
               "FactoryIQ transforms legacy machines into self-diagnosing, cost-aware assets without expensive mechanical overhaul.")

    sol_cards = [
        {
            "step": "PILLAR 1",
            "title": "Non-Invasive IoT Telemetry Stream",
            "accent": CYAN,
            "bullets": [
                "Ingests vibration (mm/s), bearing & motor temp (°C), load %, shaft RPM, and power draw (kW).",
                "Continuous 3-second streaming across 50-machine fleet into high-throughput PostgreSQL time-series store.",
                "Zero equipment replacement required; works seamlessly over existing industrial controllers and sensors."
            ]
        },
        {
            "step": "PILLAR 2",
            "title": "Predictive AI & Explainability Engine",
            "accent": AMBER,
            "bullets": [
                "Dual-ML Pipeline: Isolation Forest flags multivariate anomalies; XGBoost computes failure risk probability.",
                "Explainable AI (SHAP): Pinpoints the precise degradation source (e.g., 64% bearing vibration harmonic).",
                "Financial Translation: Converts technical wear into live 'Rupees at Risk (₹)' to prioritize critical bottlenecks."
            ]
        },
        {
            "step": "PILLAR 3",
            "title": "Inventory-Aware Closed-Loop Dispatch",
            "accent": EMERALD,
            "bullets": [
                "Automated Spare Parts Check: Verifies inventory (bearings, seals, belts) before assigning work orders.",
                "Intelligent Dynamic Scheduling: Shifts technician bandwidth to ready jobs if parts are backordered.",
                "Role-Based Shop Floor Execution: Plant Managers, Station Supervisors, and Field Engineers work in sync."
            ]
        }
    ]

    p_w = Inches(3.68)
    p_h = Inches(5.0)
    for i, sc in enumerate(sol_cards):
        c_left = Inches(0.8) + i * Inches(4.02)
        c_top = Inches(1.9)
        add_card(s3, c_left, c_top, p_w, p_h)

        # Accent top bar on each card
        top_bar = s3.shapes.add_shape(MSO_SHAPE.RECTANGLE, c_left, c_top, p_w, Inches(0.08))
        top_bar.fill.solid()
        top_bar.fill.fore_color.rgb = sc['accent']
        top_bar.line.fill.background()

        tb = s3.shapes.add_textbox(c_left + Inches(0.25), c_top + Inches(0.25), p_w - Inches(0.5), p_h - Inches(0.5))
        tf = tb.text_frame
        tf.word_wrap = True

        p0 = tf.paragraphs[0]
        r0 = p0.add_run()
        r0.text = sc['step']
        r0.font.size = Pt(10)
        r0.font.bold = True
        r0.font.color.rgb = sc['accent']

        p1 = tf.add_paragraph()
        r1 = p1.add_run()
        r1.text = sc['title']
        r1.font.size = Pt(15)
        r1.font.bold = True
        r1.font.color.rgb = TEXT_WHITE

        for b in sc['bullets']:
            pb = tf.add_paragraph()
            pb.space_before = Pt(8)
            rb = pb.add_run()
            rb.text = f"• {b}"
            rb.font.size = Pt(10.5)
            rb.font.color.rgb = TEXT_MUTED

    # =========================================================================
    # SLIDE 4: Technical Core - Dual ML Pipeline & Explainable AI
    # =========================================================================
    s4 = prs.slides.add_slide(blank_layout)
    set_slide_background(s4)
    add_header(s4, 4, "Algorithmic Novelty: Dual-Model ML & Explainable AI (XAI)",
               "Moving beyond simple thresholds to multivariate pattern recognition and fully transparent root-cause diagnostics.")

    ml_cards = [
        {
            "tag": "UNSUPERVISED ANOMALY DETECTION",
            "model": "Isolation Forest (Scikit-Learn)",
            "color": CYAN,
            "desc": "Continuously evaluates multivariate rolling feature vectors (temperature + vibration + load) to isolate anomalous data points without requiring pre-labeled failure data. Catches subtle machine degradation days before catastrophic threshold breaches."
        },
        {
            "tag": "SUPERVISED FAILURE PROBABILITY",
            "model": "XGBoost Classifier",
            "color": BLUE_ACCENT,
            "desc": "Trained on historical operational stress cycles to output calibrated Failure Risk Percentages (0–100%) and estimate Remaining Useful Life (RUL). Automatically categorizes machine states into Normal, Warning, and Critical health tiers."
        },
        {
            "tag": "TRANSPARENT ROOT CAUSE",
            "model": "SHAP (Shapley Additive Explanations)",
            "color": EMERALD,
            "desc": "Eliminates the 'AI Black Box'. Quantifies exact feature contributions for every alert (e.g., 'Bearing Vibration accounts for 64% of risk, Motor Thermal Dissipation accounts for 26%'). Technicians know exactly what tool to bring before walking onto the shop floor."
        },
        {
            "tag": "FINANCIAL IMPACT QUANTIFICATION",
            "model": "Real-Time 'Rupees at Risk' (₹)",
            "color": AMBER,
            "desc": "Bridges engineering and executive decision-making: Calculates real-time financial exposure as Downtime Hours × Production Rate × Contribution Margin. Enables plant managers to prioritize repairs based on actual monetary consequence."
        }
    ]

    for p, (c_left, c_top) in zip(ml_cards, positions):
        add_card(s4, c_left, c_top, card_w, card_h)
        tb = s4.shapes.add_textbox(c_left + Inches(0.3), c_top + Inches(0.22), card_w - Inches(0.6), card_h - Inches(0.4))
        tf = tb.text_frame
        tf.word_wrap = True

        p0 = tf.paragraphs[0]
        r_tag = p0.add_run()
        r_tag.text = p['tag']
        r_tag.font.size = Pt(9.5)
        r_tag.font.bold = True
        r_tag.font.color.rgb = p['color']

        p1 = tf.add_paragraph()
        r_m = p1.add_run()
        r_m.text = p['model']
        r_m.font.size = Pt(15)
        r_m.font.bold = True
        r_m.font.color.rgb = TEXT_WHITE

        p2 = tf.add_paragraph()
        r_d = p2.add_run()
        r_d.text = p['desc']
        r_d.font.size = Pt(10.5)
        r_d.font.color.rgb = TEXT_MUTED

    # =========================================================================
    # SLIDE 5: Key Innovation - Inventory-Aware Scheduling & ML Auto-Assignment
    # =========================================================================
    s5 = prs.slides.add_slide(blank_layout)
    set_slide_background(s5)
    add_header(s5, 5, "Intelligent Execution: Inventory-Aware Scheduling & Auto-Dispatch",
               "Solving real-world floor bottlenecks: matching machine diagnostics with spare parts availability and technician skills.")

    inv_cards = [
        {
            "badge": "INNOVATION HIGHLIGHT #1",
            "title": "Smart Spare Parts Inventory Verification",
            "accent": CYAN,
            "subtitle": "No more wasted trips to broken machines with missing parts",
            "points": [
                ("Live Stock Audit: ", "When ML flags machine degradation, FactoryIQ instantly queries the spare parts inventory (bearings, mechanical seals, timing belts, motor couplings)."),
                ("In-Stock Flow: ", "If parts exist, work order attaches exact storage bin location, required tools, and Lockout/Tagout (LOTO) safety instructions."),
                ("Out-of-Stock Fallback: ", "If the part is backordered, the system dynamically reprioritizes the queue—directing technicians to other urgent repairs first while auto-generating an inventory reorder ticket.")
            ]
        },
        {
            "badge": "INNOVATION HIGHLIGHT #2",
            "title": "ML-Powered Automated Work Order Generation",
            "accent": AMBER,
            "subtitle": "Autonomous task routing from diagnosis to execution",
            "points": [
                ("Automated Diagnosis Description: ", "AI automatically composes the work order description with root cause, current sensor readings, and recommended corrective action."),
                ("Technician Skill Matching: ", "Intelligent dispatch engine assigns tasks to the most qualified on-duty technician based on specialization, station proximity, and current workload."),
                ("Audit Trail & Resolution Signoff: ", "Maintains an immutable digital log of assigned time, technician notes, LOTO verification, and final supervisor signoff.")
            ]
        }
    ]

    c5_w = Inches(5.65)
    c5_h = Inches(5.0)
    for i, ic in enumerate(inv_cards):
        c_left = Inches(0.8) + i * Inches(6.08)
        c_top = Inches(1.9)
        add_card(s5, c_left, c_top, c5_w, c5_h)

        # Accent top bar
        tbar = s5.shapes.add_shape(MSO_SHAPE.RECTANGLE, c_left, c_top, c5_w, Inches(0.08))
        tbar.fill.solid()
        tbar.fill.fore_color.rgb = ic['accent']
        tbar.line.fill.background()

        tb = s5.shapes.add_textbox(c_left + Inches(0.35), c_top + Inches(0.25), c5_w - Inches(0.7), c5_h - Inches(0.5))
        tf = tb.text_frame
        tf.word_wrap = True

        p0 = tf.paragraphs[0]
        r0 = p0.add_run()
        r0.text = ic['badge']
        r0.font.size = Pt(10)
        r0.font.bold = True
        r0.font.color.rgb = ic['accent']

        p1 = tf.add_paragraph()
        r1 = p1.add_run()
        r1.text = ic['title']
        r1.font.size = Pt(16)
        r1.font.bold = True
        r1.font.color.rgb = TEXT_WHITE

        p_sub = tf.add_paragraph()
        r_sub = p_sub.add_run()
        r_sub.text = ic['subtitle']
        r_sub.font.size = Pt(11)
        r_sub.font.bold = True
        r_sub.font.color.rgb = TEXT_SECONDARY

        for label, text in ic['points']:
            pb = tf.add_paragraph()
            pb.space_before = Pt(10)
            rl = pb.add_run()
            rl.text = f"• {label}"
            rl.font.size = Pt(10.5)
            rl.font.bold = True
            rl.font.color.rgb = TEXT_WHITE
            rt = pb.add_run()
            rt.text = text
            rt.font.size = Pt(10.5)
            rt.font.color.rgb = TEXT_MUTED

    # =========================================================================
    # SLIDE 6: System Architecture & Technology Stack
    # =========================================================================
    s6 = prs.slides.add_slide(blank_layout)
    set_slide_background(s6)
    add_header(s6, 6, "Full-Stack System Architecture & Technology Stack",
               "Built with production-grade technologies designed for high-concurrency industrial streaming and low-latency inference.")

    arch_layers = [
        {
            "layer": "01. EDGE & IOT INGESTION",
            "tech": "Python Async Daemon  |  Industrial Gateway Emulation",
            "accent": CYAN,
            "bullets": [
                "Continuous 3-second multi-parameter telemetry stream simulating 50 factory machines.",
                "Captures vibration (mm/s), bearing/motor temps, power (kW), load %, and shaft RPM."
            ]
        },
        {
            "layer": "02. TIME-SERIES DATA PERSISTENCE",
            "tech": "PostgreSQL 16  |  SQLAlchemy 2.0  |  Psycopg2",
            "accent": BLUE_ACCENT,
            "bullets": [
                "Optimized relational schema for fleet metadata and high-frequency time-series history.",
                "Atomic transaction logging for work orders, user roles, inventory, and historical audit logs."
            ]
        },
        {
            "layer": "03. INTELLIGENCE & MICROSERVICES",
            "tech": "FastAPI  |  Scikit-Learn  |  XGBoost  |  SHAP  |  JWT OAuth2",
            "accent": AMBER,
            "bullets": [
                "Isolation Forest anomaly detector + XGBoost failure probability scoring engine.",
                "SHAP waterfall explainability service and role-based access control (Manager, Supervisor, Worker)."
            ]
        },
        {
            "layer": "04. EXECUTIVE & FIELD USER INTERFACE",
            "tech": "React 18  |  TypeScript  |  Tailwind CSS  |  Recharts  |  Vite",
            "accent": EMERALD,
            "bullets": [
                "Station heat-map navigation (Stations A-D), radial SVG risk dials, and live telemetry graphs.",
                "Closed-loop work order assignment and resolution confirmation workflows."
            ]
        }
    ]

    l_w = Inches(11.733)
    l_h = Inches(1.15)
    for i, al in enumerate(arch_layers):
        l_top = Inches(1.9) + i * Inches(1.3)
        add_card(s6, Inches(0.8), l_top, l_w, l_h)

        # Left Accent strip
        astrip = s6.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), l_top, Inches(0.12), l_h)
        astrip.fill.solid()
        astrip.fill.fore_color.rgb = al['accent']
        astrip.line.fill.background()

        tb = s6.shapes.add_textbox(Inches(1.15), l_top + Inches(0.12), l_w - Inches(0.5), l_h - Inches(0.24))
        tf = tb.text_frame
        tf.word_wrap = True

        p0 = tf.paragraphs[0]
        r0 = p0.add_run()
        r0.text = f"{al['layer']}  —  "
        r0.font.size = Pt(11)
        r0.font.bold = True
        r0.font.color.rgb = al['accent']

        r_tech = p0.add_run()
        r_tech.text = al['tech']
        r_tech.font.size = Pt(11)
        r_tech.font.bold = True
        r_tech.font.color.rgb = TEXT_WHITE

        p1 = tf.add_paragraph()
        p1.space_before = Pt(3)
        r1 = p1.add_run()
        r1.text = " • ".join(al['bullets'])
        r1.font.size = Pt(10)
        r1.font.color.rgb = TEXT_MUTED

    # =========================================================================
    # SLIDE 7: Measurable Impact & Business Feasibility
    # =========================================================================
    s7 = prs.slides.add_slide(blank_layout)
    set_slide_background(s7)
    add_header(s7, 7, "Measurable Real-World Impact & Business Feasibility",
               "Quantifiable operational, financial, and sustainability improvements for manufacturing enterprises.")

    kpis = [
        {
            "metric": "70%",
            "label": "REDUCTION IN UNPLANNED DOWNTIME",
            "color": CYAN,
            "desc": "Shifting from reactive breakdown firefighting to precision predictive intervention saves hundreds of hours of lost production line capacity."
        },
        {
            "metric": "Zero",
            "label": "WASTED MAINTENANCE TRIPS",
            "color": EMERALD,
            "desc": "Real-time spare parts verification ensures technicians never arrive at a broken machine without the exact replacement component in hand."
        },
        {
            "metric": "15-20%",
            "label": "INDUSTRIAL ENERGY REDUCTION",
            "color": AMBER,
            "desc": "Sub-metered power tracking pinpoints wasteful baseload draws, slipping motor drives, and unoptimized idle-cycle equipment consumption."
        },
        {
            "metric": "< 6 Mos",
            "label": "RETURN ON INVESTMENT (ROI)",
            "color": BLUE_ACCENT,
            "desc": "Non-invasive software overlay works with legacy infrastructure, avoiding multi-crore capital expenses and delivering rapid enterprise payback."
        }
    ]

    for p, (c_left, c_top) in zip(kpis, positions):
        add_card(s7, c_left, c_top, card_w, card_h)
        tb = s7.shapes.add_textbox(c_left + Inches(0.35), c_top + Inches(0.2), card_w - Inches(0.7), card_h - Inches(0.4))
        tf = tb.text_frame
        tf.word_wrap = True

        p0 = tf.paragraphs[0]
        r_num = p0.add_run()
        r_num.text = p['metric']
        r_num.font.size = Pt(32)
        r_num.font.bold = True
        r_num.font.color.rgb = p['color']

        p1 = tf.add_paragraph()
        r_lbl = p1.add_run()
        r_lbl.text = p['label']
        r_lbl.font.size = Pt(11)
        r_lbl.font.bold = True
        r_lbl.font.color.rgb = TEXT_WHITE

        p2 = tf.add_paragraph()
        r_desc = p2.add_run()
        r_desc.text = p['desc']
        r_desc.font.size = Pt(10.5)
        r_desc.font.color.rgb = TEXT_MUTED

    # =========================================================================
    # SLIDE 8: Scalability, Roadmap & Conclusion
    # =========================================================================
    s8 = prs.slides.add_slide(blank_layout)
    set_slide_background(s8)
    add_header(s8, 8, "Future Scalability & Hackathon Roadmap",
               "A clear path from hackathon validation to enterprise factory deployment.")

    roadmap_cards = [
        {
            "phase": "ROUND 2 (DEC 2026)",
            "title": "Hardware Gateway & Extended Edge Intelligence",
            "accent": CYAN,
            "bullets": [
                "Native industrial protocol connectors: Modbus TCP, MQTT broker, and OPC-UA server integration.",
                "Edge ML inference deployment directly on industrial Raspberry Pi / NVIDIA Jetson gateway units."
            ]
        },
        {
            "phase": "ENTERPRISE SCALING",
            "title": "ERP Integration & Automated Supply Chain",
            "accent": AMBER,
            "bullets": [
                "Bidirectional API integration with SAP PM and Oracle NetSuite for automated inventory procurement.",
                "Cross-plant fleet benchmarking across geographically distributed manufacturing sites."
            ]
        },
        {
            "phase": "NEXT HORIZON",
            "title": "Computer Vision & Acoustic Defect Detection",
            "accent": EMERALD,
            "bullets": [
                "Optical defect scanning on finished components integrated into quality assurance stations.",
                "High-frequency acoustic ultrasonic vibration analysis for micro-crack detection in high-speed spindles."
            ]
        }
    ]

    r_w = Inches(3.68)
    r_h = Inches(3.4)
    for i, rc in enumerate(roadmap_cards):
        c_left = Inches(0.8) + i * Inches(4.02)
        c_top = Inches(1.9)
        add_card(s8, c_left, c_top, r_w, r_h)

        top_bar = s8.shapes.add_shape(MSO_SHAPE.RECTANGLE, c_left, c_top, r_w, Inches(0.08))
        top_bar.fill.solid()
        top_bar.fill.fore_color.rgb = rc['accent']
        top_bar.line.fill.background()

        tb = s8.shapes.add_textbox(c_left + Inches(0.25), c_top + Inches(0.25), r_w - Inches(0.5), r_h - Inches(0.5))
        tf = tb.text_frame
        tf.word_wrap = True

        p0 = tf.paragraphs[0]
        r0 = p0.add_run()
        r0.text = rc['phase']
        r0.font.size = Pt(10)
        r0.font.bold = True
        r0.font.color.rgb = rc['accent']

        p1 = tf.add_paragraph()
        r1 = p1.add_run()
        r1.text = rc['title']
        r1.font.size = Pt(14)
        r1.font.bold = True
        r1.font.color.rgb = TEXT_WHITE

        for b in rc['bullets']:
            pb = tf.add_paragraph()
            pb.space_before = Pt(8)
            rb = pb.add_run()
            rb.text = f"• {b}"
            rb.font.size = Pt(10.5)
            rb.font.color.rgb = TEXT_MUTED

    # Bottom Conclusion Banner
    cb = add_card(s8, Inches(0.8), Inches(5.5), Inches(11.733), Inches(1.4), bg_color=CARD_BG_ALT, border_color=CYAN)
    ctb = s8.shapes.add_textbox(Inches(1.1), Inches(5.65), Inches(11.1), Inches(1.1))
    ctf = ctb.text_frame
    ctf.word_wrap = True

    cp1 = ctf.paragraphs[0]
    cr1 = cp1.add_run()
    cr1.text = "CONCLUSION & VISION"
    cr1.font.size = Pt(10.5)
    cr1.font.bold = True
    cr1.font.color.rgb = CYAN

    cp2 = ctf.add_paragraph()
    cr2 = cp2.add_run()
    cr2.text = (
        "FactoryIQ bridges the critical divide between raw factory sensors, predictive machine learning, "
        "and physical shop-floor maintenance. By combining Explainable AI with smart inventory-aware routing, "
        "we empower manufacturing plants to eliminate unplanned downtime, optimize technician efficiency, and secure their bottom line."
    )
    cr2.font.size = Pt(11.5)
    cr2.font.color.rgb = TEXT_WHITE

    # Save Presentation
    prs.save(output_path)
    print(f"Successfully generated: {output_path}")

if __name__ == "__main__":
    out_file = sys.argv[1] if len(sys.argv) > 1 else "FactoryIQ_Innovate_India_2026.pptx"
    build_presentation(out_file)
