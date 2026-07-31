/* ────────────────────────────────────────────────────────────
   Inspection templates.

   This file is the whole content layer. To add an appliance type,
   copy a template object and change the stages — nothing in the
   app code needs to know about it.

   item.photos  = the shots the tech is REQUIRED to take
   item.help    = what to actually look at, in plain field language
   item.ref     = code citation printed on the customer report
   ──────────────────────────────────────────────────────────── */

export const VERDICTS = {
  ok:      { label: 'OK',      color: 'var(--ok)',      weight: 0 },
  monitor: { label: 'Monitor', color: 'var(--monitor)', weight: 1 },
  defect:  { label: 'Defect',  color: 'var(--defect)',  weight: 2 },
};

export const TEMPLATES = [
  {
    id: 'gas-wh',
    name: 'Gas water heater vent',
    blurb: 'Category I appliance on a masonry or B-vent chimney',
    stages: [
      {
        id: 'space',
        name: 'Appliance & space',
        items: [
          {
            id: 'wh-rating',
            label: 'Rating plate and appliance category',
            help: 'Photograph the data plate. Record input in BTU/h and confirm it is a Category I draft-hood appliance. If it is a sealed or condensing unit, stop — it does not belong on this chimney.',
            ref: 'Manufacturer listing',
            photos: [{ id: 'plate', label: 'Data plate' }],
          },
          {
            id: 'wh-clearance',
            label: 'Clearances to combustibles',
            help: 'Check the clearances on the label against what is actually there — storage, framing, finished walls. Shelving stacked against a water heater is a finding.',
            ref: 'Appliance label',
            photos: [{ id: 'clear-front', label: 'Front and sides' }],
          },
          {
            id: 'wh-comb-air',
            label: 'Combustion air',
            help: 'Is the appliance in a confined space? Look for openings sized to the input, or a louvred door. Note any exhaust fan, dryer or air handler in the same space that can pull the room negative.',
            ref: 'NFPA 54 / IFGC combustion air',
            photos: [{ id: 'air', label: 'Combustion air opening' }],
          },
          {
            id: 'wh-co-alarm',
            label: 'CO alarm present and in date',
            help: 'Note whether a CO alarm exists, where it is, and whether it is past its expiry. A silent alarm proves nothing — record it as information, not as a pass.',
            ref: 'Site condition',
            photos: [{ id: 'alarm', label: 'CO alarm' }],
          },
        ],
      },
      {
        id: 'connector',
        name: 'Draft hood & connector',
        items: [
          {
            id: 'wh-hood',
            label: 'Draft hood condition',
            help: 'Check the hood is the one that came with the appliance, seated correctly, and not blocked, crushed or rusted through.',
            ref: 'Manufacturer listing',
            photos: [{ id: 'hood', label: 'Draft hood' }],
          },
          {
            id: 'wh-conn-size',
            label: 'Connector size and material',
            help: 'The connector may not be smaller than the appliance outlet. Single-wall or listed double-wall — record which.',
            ref: 'NFPA 211 connector sizing',
            photos: [{ id: 'conn', label: 'Connector run' }],
          },
          {
            id: 'wh-conn-slope',
            label: 'Rise and support',
            help: 'Connector rises toward the chimney at least 1/4 in. per foot. Check for sags, long horizontal runs and missing supports.',
            ref: 'NFPA 211 — 1/4 in. per ft rise',
            photos: [{ id: 'slope', label: 'Slope and supports' }],
          },
          {
            id: 'wh-conn-joints',
            label: 'Joints and fasteners',
            help: 'At least three fasteners per joint, crimped male end toward the appliance. Look for open seams and taped repairs.',
            ref: 'NFPA 211 connector joints',
            photos: [{ id: 'joint', label: 'A typical joint' }],
          },
          {
            id: 'wh-conn-clearance',
            label: 'Connector clearance to combustibles',
            help: 'Single-wall connector needs 18 in. to combustibles unless a listed reduction is in place. A panel screwed flat to the wall is not a reduction.',
            ref: 'NFPA 211 — 18 in. single-wall',
            photos: [{ id: 'conn-clear', label: 'Clearance at the tightest point' }],
          },
          {
            id: 'wh-thimble',
            label: 'Thimble and chimney entry',
            help: 'Connector enters through a proper thimble, does not project into the flue, and the masonry around it is sound and sealed.',
            ref: 'NFPA 211 chimney inlet',
            photos: [{ id: 'thimble', label: 'Thimble / entry point' }],
          },
        ],
      },
      {
        id: 'chimney',
        name: 'Chimney',
        items: [
          {
            id: 'ch-liner',
            label: 'Liner type and condition',
            help: 'Clay, listed metal liner, or unlined. Scan for cracks, missing mortar joints, displaced tiles and spalling. Unlined masonry on a gas appliance is a finding.',
            ref: 'NFPA 211 Ch. 9 lining',
            photos: [{ id: 'liner-top', label: 'Flue from the top' }, { id: 'liner-scan', label: 'Camera scan still' }],
          },
          {
            id: 'ch-size',
            label: 'Flue sizing for the connected load',
            help: 'Is the flue oversized for this appliance alone? Note whether a larger appliance was removed and left this one orphaned on a flue built for two.',
            ref: 'NFPA 211 sizing',
            photos: [{ id: 'flue-size', label: 'Flue opening' }],
          },
          {
            id: 'ch-condensate',
            label: 'Condensation and corrosion',
            help: 'White staining, damp masonry, rusted connector at the chimney end, or crumbling mortar in the smoke chamber — all point to flue gas condensing.',
            ref: 'Field condition',
            photos: [{ id: 'staining', label: 'Staining or corrosion' }],
          },
          {
            id: 'ch-blockage',
            label: 'Blockage and debris',
            help: 'Nests, leaves, fallen tile, animal remains. Check the cleanout and the base of the flue.',
            ref: 'NFPA 211 maintenance',
            photos: [{ id: 'cleanout', label: 'Cleanout / base of flue' }],
          },
          {
            id: 'ch-crown',
            label: 'Crown, cap and termination',
            help: 'Crown cracked or missing wash, cap and screen present, termination height correct for the roof.',
            ref: 'NFPA 211 termination',
            photos: [{ id: 'crown', label: 'Crown and cap' }, { id: 'termination', label: 'Termination from the roof' }],
          },
          {
            id: 'ch-exterior',
            label: 'Exterior masonry and flashing',
            help: 'Spalled brick, open joints, leaning stack, failed flashing at the roof line.',
            ref: 'NFPA 211 structural',
            photos: [{ id: 'exterior', label: 'Full stack from outside' }],
          },
        ],
      },
      {
        id: 'performance',
        name: 'Performance tests',
        items: [
          {
            id: 'pf-spillage',
            label: 'Spillage test at the draft hood',
            help: 'Fire the appliance cold and test at the relief opening. Brief spillage while the vent warms can be normal; spillage that persists after the vent should have established draft is a failure. Record the time it took to clear.',
            ref: 'NFPA 54 / IFGC spillage test',
            photos: [{ id: 'spillage', label: 'Test at the relief opening' }],
          },
          {
            id: 'pf-worst-case',
            label: 'Worst-case depressurization',
            help: 'Repeat with the dryer, range hood, bath fans and air handler running and the house closed up. This is where a tight house pulls the flue backwards.',
            ref: 'Worst-case draft test',
            photos: [{ id: 'worst', label: 'Appliances running during test' }],
          },
          {
            id: 'pf-co',
            label: 'CO in the flue and in the room',
            help: 'Record ambient CO in the room before firing, then flue CO once running. If occupants are symptomatic, stop: people out, fuel off, ventilate, then investigate.',
            ref: 'Combustion analysis',
            photos: [{ id: 'co-meter', label: 'Meter reading' }],
          },
          {
            id: 'pf-draft',
            label: 'Draft reading',
            help: 'Record the draft measurement once the vent is up to temperature, and note the outdoor temperature with it.',
            ref: 'Combustion analysis',
            photos: [{ id: 'draft', label: 'Draft gauge' }],
          },
        ],
      },
      {
        id: 'safety',
        name: 'Water heater safety',
        items: [
          {
            id: 'sf-tpr',
            label: 'T&P valve and discharge pipe',
            help: 'Valve present, discharge piped full size to a safe termination, no threaded end, no valve in the line.',
            ref: 'Plumbing code',
            photos: [{ id: 'tpr', label: 'T&P valve and discharge' }],
          },
          {
            id: 'sf-gas',
            label: 'Gas piping, shutoff and drip leg',
            help: 'Accessible shutoff, sediment trap, no leaks at the union. Soap-test if anything smells.',
            ref: 'NFPA 54 / IFGC gas piping',
            photos: [{ id: 'gas', label: 'Gas connection' }],
          },
          {
            id: 'sf-burner',
            label: 'Burner and flame appearance',
            help: 'Flame should be stable and mostly blue. Yellow tipping, lifting, rollout at the burner door, or soot on the burner are all findings.',
            ref: 'Field condition',
            photos: [{ id: 'flame', label: 'Burner flame' }],
          },
          {
            id: 'sf-base',
            label: 'Base, stand and surroundings',
            help: 'Rust at the base, water on the floor, elevation where required, and combustible storage against the unit.',
            ref: 'Field condition',
            photos: [{ id: 'base', label: 'Base of the unit' }],
          },
        ],
      },
    ],
  },
];

export function templateById(id) {
  return TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];
}

export function allItems(template) {
  return template.stages.flatMap((s) => s.items.map((i) => ({ ...i, stageId: s.id, stageName: s.name })));
}
