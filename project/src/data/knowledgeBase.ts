export interface KnowledgeArticle {
  id: string;
  title: string;
  category: 'Mechanical' | 'Electrical' | 'Hydraulics & Seals' | 'Power Transmission';
  symptoms: string[];
  possibleCauses: string[];
  diagnosticSteps: string[];
  correctiveActions: string[];
  safetyPrecautions: string[];
}

export const KNOWLEDGE_BASE_ARTICLES: KnowledgeArticle[] = [
  {
    id: 'kb-bearing-temp',
    title: 'Excessive Bearing Temperature',
    category: 'Mechanical',
    symptoms: [
      'Bearing housing surface temperature exceeds 80°C or 35°C above ambient.',
      'Thermal discoloration or paint blistering on the bearing cap.',
      'Slight burning smell of degraded grease or smoking lubricant.'
    ],
    possibleCauses: [
      'Over-lubrication (causes viscous churning and severe heat build-up).',
      'Under-lubrication or dried/degraded grease with loss of viscosity.',
      'Misalignment between shaft and bearing housing.',
      'Excessive radial or thrust load causing internal raceway preload.',
      'Contamination by dirt, metal shavings, or moisture ingress.'
    ],
    diagnosticSteps: [
      'Verify temperature using an calibrated infrared pyrometer or contact thermal probe on the load zone.',
      'Inspect grease purging port for over-greased relief valves or black oxidized grease.',
      'Perform ultrasonic acoustic measurement to detect high-frequency friction spikes.',
      'Check shaft runout with a dial indicator to detect coupling angular or parallel offset.'
    ],
    correctiveActions: [
      'If over-lubricated: Remove grease relief plug and run motor for 30 minutes to purge excess grease.',
      'If under-lubricated: Replenish with manufacturer-specified synthetic grease (e.g. ISO VG 220 lithium complex) using calculated shot volume.',
      'Re-align motor-to-driven coupling to within 0.05 mm tolerance using laser alignment.',
      'Replace severely pitted or flaked bearings immediately during next scheduled maintenance window.'
    ],
    safetyPrecautions: [
      'Execute Lockout/Tagout (LOTO) on main 415V breaker before opening bearing housings.',
      'Wear high-temperature thermal gloves (EN 407 rated) when probing hot bearing caps.',
      'Never spray cold water or aerosol coolant directly onto an overheated bearing housing (prevents catastrophic thermal shock cracking).'
    ]
  },
  {
    id: 'kb-vibration',
    title: 'Abnormal Machine Vibration',
    category: 'Mechanical',
    symptoms: [
      'Overall velocity vibration exceeding ISO 10816-3 Class II/III warning limits (> 4.5 mm/s RMS).',
      'Audible rhythmic droning, thumping, or rattling sensations in structural baseplate.',
      'Loosening foundation anchor bolts or pipe support bracket cracking.'
    ],
    possibleCauses: [
      'Rotor or impeller unbalance due to debris accumulation or lost balancing weights.',
      'Shaft misalignment or cocked bearing sleeve.',
      'Mechanical looseness (soft foot condition or loose foundation hold-down bolts).',
      'Blade or vane pass excitation frequencies matching structural resonant frequency.'
    ],
    diagnosticSteps: [
      'Mount triaxial accelerometer (Horizontal, Vertical, Axial) on bearing blocks.',
      'Analyze FFT frequency spectrum: 1X RPM peak indicates unbalance; 2X RPM peak with high axial vibration indicates misalignment; harmonics (3X-10X) indicate mechanical looseness.',
      'Check for soft foot with feeler gauges while loosening hold-down bolts one by one.'
    ],
    correctiveActions: [
      'Clean rotor blades thoroughly and perform dynamic field balancing using a two-plane balancing analyzer to achieve ISO G2.5 grade.',
      'Correct soft foot using precision stainless steel shims under motor feet.',
      'Torque foundation bolts to engineering specification with a calibrated torque wrench and apply Loctite threadlocker.',
      'Check coupling elastomeric spider or grid element for degradation and replace if worn.'
    ],
    safetyPrecautions: [
      'Stay clear of rotating shafts and exposed drive couplings during dynamic vibration testing.',
      'Ensure safety guards are securely fastened before running test spins.',
      'Wear hearing protection (NRR 28+) and eye protection when working near vibrating machinery.'
    ]
  },
  {
    id: 'kb-motor-overheating',
    title: 'Motor Overheating',
    category: 'Electrical',
    symptoms: [
      'Motor stator casing temperature exceeds Class F insulation rating (> 105°C).',
      'Thermal overload relay frequently tripping during normal operation.',
      'Pungent varnish smell coming from motor terminal box or cooling fan cowl.'
    ],
    possibleCauses: [
      'Cooling fan cowl or air intake grille clogged with industrial dust, lint, or oil mist.',
      'Voltage unbalance across phases (> 2% unbalance causes dramatic winding temperature rise).',
      'Overload condition caused by mechanical binding or undersized motor frame.',
      'Excessive starts/stops per hour exceeding NEMA design specifications.',
      'Damaged cooling fan blades or reverse motor rotation.'
    ],
    diagnosticSteps: [
      'Measure three-phase current (L1, L2, L3) with a True-RMS clamp meter and compute phase balance.',
      'Measure phase voltages at the motor terminal lugs under load.',
      'Check ventilation airflow through stator cooling fins with an anemometer.',
      'Perform motor winding insulation resistance test (Megger 1000V DC test: minimum 5 MΩ required).'
    ],
    correctiveActions: [
      'Clean stator external cooling fins and clear fan cowling using dry compressed air (< 30 PSI).',
      'Correct incoming power supply phase unbalance; notify plant electrical substation engineers.',
      'Inspect driven machine for mechanical friction or jamming before restarting motor.',
      'Ensure cooling fan is correctly keyed to shaft and rotating in the intended direction.'
    ],
    safetyPrecautions: [
      'Isolate motor at main distribution board and lock out switch before inspecting terminal connections.',
      'Discharge any power-factor correction capacitors before touching motor terminals.',
      'Confirm zero voltage using a verified Class IV multi-meter before touching conductors.'
    ]
  },
  {
    id: 'kb-shaft-noise',
    title: 'Unusual Shaft Noise',
    category: 'Mechanical',
    symptoms: [
      'High-pitched screeching, metallic grinding, clicking, or persistent humming around shaft.',
      'Irregular rubbing noises that vary with rotational speed (RPM).',
      'Fine metallic dust or filings settling below shaft seals or coupling guards.'
    ],
    possibleCauses: [
      'Shaft rubbing against stationary labyrinth seal, deflector ring, or safety guard.',
      'Bent or deflected shaft from excessive belt tension or thermal bow.',
      'Loose shaft collar, locking sleeve, or worn keyway allowing key rocking.',
      'Internal cage breakdown in ball or cylindrical roller bearings.'
    ],
    diagnosticSteps: [
      'Use an industrial acoustic stethoscope or ultrasound detector to isolate the exact noise epicenter.',
      'Manually rotate shaft by hand (de-energized) to feel for binding, tight spots, or axial end-play.',
      'Measure Total Indicator Reading (TIR) shaft runout along the shaft span using a dial gauge.'
    ],
    correctiveActions: [
      'Adjust stationary seal clearances and realign safety guard to maintain minimum 5 mm clearance.',
      'Tighten adapter sleeve locknuts to recommended angle of turn and lock with tab washer.',
      'Replace worn keys and recut keyway or replace shaft if wallowed out beyond 0.1 mm.',
      'Replace damaged bearing set and inspect shaft journal for scoring or fretting corrosion.'
    ],
    safetyPrecautions: [
      'Never touch a rotating shaft or attempt to locate noise by hand while machine is powered.',
      'Apply complete LOTO procedure before removing coupling guards or rotating shaft manually.',
      'Ensure loose clothing, ties, and jewelry are removed before working on mechanical power transmission trains.'
    ]
  },
  {
    id: 'kb-belt-slippage',
    title: 'Belt Slippage',
    category: 'Power Transmission',
    symptoms: [
      'High-pitched squealing or chirping during machine startup or sudden load surges.',
      'Driven shaft running below rated RPM despite motor running at full rated speed.',
      'Premature belt wear, sidewall glazing, cracked ribs, or burnt rubber odor.'
    ],
    possibleCauses: [
      'Insufficient belt tension (tension slack under dynamic loading).',
      'Oil, grease, or coolant contamination on pulley sheaves.',
      'Worn pulley groove profile (bottoming out of V-belt).',
      'Pulley angular or parallel misalignment causing uneven belt seating.'
    ],
    diagnosticSteps: [
      'Measure belt deflection force using a mechanical tension gauge or sonic belt tension meter.',
      'Inspect pulley grooves with a sheave profile gauge to check for cupping or wall wear.',
      'Check pulley alignment with a laser belt alignment tool across both faces.',
      'Inspect belt underside for oil saturation or dry-rot cracking.'
    ],
    correctiveActions: [
      'Re-tension belt to manufacturer target frequency (Hz) or deflection force using motor jack screws.',
      'Clean pulley grooves with approved non-residue industrial degreaser; replace contaminated belts (never re-use oil-soaked rubber belts).',
      'Replace sheaves when wear exceeds 0.8 mm between belt profile gauge and sheave face.',
      'Ensure pulleys are parallel and coplanar to within 0.5° angular offset.'
    ],
    safetyPrecautions: [
      'Lock out motor power before opening belt guard or placing hands near pulleys (high pinch point hazard).',
      'Never spray belt dressing or fluids onto running belts to stop squealing.',
      'Always replace belts in matched sets on multi-groove drives to ensure equal load distribution.'
    ]
  },
  {
    id: 'kb-seal-leakage',
    title: 'Mechanical Seal Leakage',
    category: 'Hydraulics & Seals',
    symptoms: [
      'Continuous dripping or spraying of process liquid / lubricant from seal gland housing.',
      'Crystallized product or slurry accumulation around seal gland plate.',
      'Pressure drop in barrier fluid reservoir on dual pressurized seal arrangements.'
    ],
    possibleCauses: [
      'Seal face distortion from thermal shock or excessive gland bolt torquing.',
      'Dry running of seal faces due to loss of flush fluid or air trapped in stuffing box.',
      'Degradation or chemical swelling of secondary O-rings / elastomeric bellows.',
      'Excessive shaft radial runout or axial float exceeding seal design tolerances (typically > 0.05 mm).'
    ],
    diagnosticSteps: [
      'Inspect seal flush line, cyclone separator, and throttling orifice for blockage or closed valves.',
      'Measure barrier fluid pressure, temperature, and level in seal support reservoir.',
      'Check pump shaft axial float and radial deflection with dial test indicator at seal chamber face.',
      'Inspect dismounted seal faces under monochromatic light band flat testing for heat checking or deep gouges.'
    ],
    correctiveActions: [
      'Restore clean buffer/barrier fluid flow and verify vent line is purged of trapped air.',
      'Replace damaged primary seal face rings (silicon carbide / carbon) and elastomer packings.',
      'Evenly torque gland bolts in diagonal sequence using a torque wrench to prevent face warping.',
      'Ensure pump operating point is within allowable operating range (avoid cavitation or deadhead operation).'
    ],
    safetyPrecautions: [
      'Depressurize and completely drain pump casing before loosening gland bolts.',
      'Check SDS (Safety Data Sheet) for hazardous or corrosive pumped fluids and wear appropriate chemical splash PPE and face shield.',
      'Ensure thermal lines and hot liquid flushes have cooled below 40°C before commencing disassembly.'
    ]
  }
];
