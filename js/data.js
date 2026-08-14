// Seed data + constants for the Naming Opportunities mobile admin prototype.
// Field schema sourced from "Naming Opportunity Fields.xlsx" (Object / Instance / Note / Task).

const OBJECT_TYPES = [
  'Building', 'Wing', 'Suite', 'Entrance', 'Lab', 'Garden', 'Terrace',
  'Donor Wall', 'Auditorium Seat', 'Tree', 'Room', 'Plaza',
];

const SPECIALTIES = [
  'Cardiology', "Women's & Children's", 'General', 'Behavioral Health',
  'Education', 'Emergency Medicine', 'Oncology', 'Nursing Education',
];

const FUNDS = [
  'Heart & Vascular Fund', 'Maternal Health Fund', 'Annual Fund', 'Wellness Fund',
  'Education Fund', 'Emergency Care Fund', 'Cancer Care Fund',
  'Workforce Development Fund', 'Memorial Gifts Fund',
];

const CAMPAIGNS = ['Forward Together Campaign', 'Legacy Society', 'Annual Fund'];

const TASK_STATUSES = ['Open', 'In Progress', 'Complete'];

// Small lat/lng deltas around a fictional hospital campus so "distance" is meaningful.
const CENTER = { lat: 39.9560, lng: -75.1636 };
function pt(dLat, dLng) {
  return { lat: +(CENTER.lat + dLat).toFixed(6), lng: +(CENTER.lng + dLng).toFixed(6) };
}

const SEED_OBJECTS = [
  {
    id: 'O1', name: 'Cardiovascular Institute Building', description: 'Flagship home of the Heart & Vascular Institute, four-story clinical tower.',
    type: 'Building', location: 'North Campus', specialty: 'Cardiology', fund: 'Heart & Vascular Fund',
    campaign: 'Forward Together Campaign', askAmount: 5000000, squareFootage: 45000,
    comments: 'Premier naming opportunity. Board-level approval required for signage placement.', customField: '',
    ...pt(0.0041, -0.0062), pictures: [],
  },
  {
    id: 'O2', name: 'Family Birthing Center', description: 'Newly renovated maternity wing with 24 private suites.',
    type: 'Wing', location: "Women's Pavilion, 3rd Floor", specialty: "Women's & Children's", fund: 'Maternal Health Fund',
    campaign: 'Forward Together Campaign', askAmount: 2500000, squareFootage: 18000,
    comments: '', customField: '',
    ...pt(0.0028, -0.0011), pictures: [],
  },
  {
    id: 'O3', name: 'Donor Recognition Wall', description: 'Interactive digital + engraved wall in the main lobby honoring all campaign donors.',
    type: 'Donor Wall', location: 'Main Lobby', specialty: 'General', fund: 'Annual Fund',
    campaign: 'Forward Together Campaign', askAmount: null, squareFootage: 800,
    comments: 'Plaques sold individually as Instances.', customField: 'Vendor: Luminous Signage Co.',
    ...pt(0.0, 0.0), pictures: [],
  },
  {
    id: 'O4', name: 'Healing Garden', description: 'Outdoor courtyard garden with paver walkway for reflection and therapy sessions.',
    type: 'Garden', location: 'Courtyard C', specialty: 'Behavioral Health', fund: 'Wellness Fund',
    campaign: 'Forward Together Campaign', askAmount: 250000, squareFootage: 6000,
    comments: 'Pavers sold individually as Instances.', customField: '',
    ...pt(-0.0019, 0.0035), pictures: [],
  },
  {
    id: 'O5', name: 'Pediatric Auditorium Seating', description: '220-seat community auditorium used for education events and family conferences.',
    type: 'Auditorium Seat', location: 'Community Auditorium', specialty: 'Education', fund: 'Education Fund',
    campaign: 'Legacy Society', askAmount: null, squareFootage: 4200,
    comments: 'Seats sold individually as Instances by Section/Row/Sequence.', customField: '',
    ...pt(0.0007, 0.0048), pictures: [],
  },
  {
    id: 'O6', name: 'Emergency Department Entrance', description: 'Level II trauma center main entrance and ambulance bay canopy.',
    type: 'Entrance', location: 'East Campus', specialty: 'Emergency Medicine', fund: 'Emergency Care Fund',
    campaign: 'Forward Together Campaign', askAmount: 1000000, squareFootage: 2200,
    comments: '', customField: '',
    ...pt(0.0063, 0.0071), pictures: [],
  },
  {
    id: 'O7', name: 'Oncology Infusion Suite', description: '16-chair infusion suite with garden views.',
    type: 'Suite', location: 'Cancer Center, 2nd Floor', specialty: 'Oncology', fund: 'Cancer Care Fund',
    campaign: 'Forward Together Campaign', askAmount: 750000, squareFootage: 5200,
    comments: '', customField: '',
    ...pt(-0.0035, -0.0028), pictures: [],
  },
  {
    id: 'O8', name: 'Simulation Lab', description: 'High-fidelity clinical simulation lab for nursing and resident training.',
    type: 'Lab', location: 'Education Center', specialty: 'Nursing Education', fund: 'Workforce Development Fund',
    campaign: 'Legacy Society', askAmount: 500000, squareFootage: 3100,
    comments: '', customField: '',
    ...pt(0.0088, -0.0044), pictures: [],
  },
  {
    id: 'O9', name: 'Rooftop Meditation Terrace', description: 'Quiet outdoor terrace for patients, families, and staff.',
    type: 'Terrace', location: 'Rooftop, Tower B', specialty: 'Behavioral Health', fund: 'Wellness Fund',
    campaign: 'Forward Together Campaign', askAmount: 300000, squareFootage: 1800,
    comments: '', customField: '',
    ...pt(0.0015, -0.0095), pictures: [],
  },
  {
    id: 'O10', name: 'Memorial Tree Grove', description: 'Grove of memorial trees along the south lawn walking path.',
    type: 'Tree', location: 'South Lawn', specialty: 'General', fund: 'Memorial Gifts Fund',
    campaign: 'Annual Fund', askAmount: null, squareFootage: null,
    comments: 'Trees sold individually as Instances.', customField: '',
    ...pt(-0.0072, 0.0018), pictures: [],
  },
];

const SEED_INSTANCES = [
  // Donor Recognition Wall (O3) — plaques
  { id: 'I1', objectId: 'O3', instanceName: 'Plaque A1', comments: '', dedication: 'In Honor of the Whitman Family', specificLocation: 'Panel A, Top Row', engravingLine1: 'THE WHITMAN FAMILY', engravingLine2: 'With Gratitude', section: 'Panel A', row: '1', sequence: '1', pictures: [] },
  { id: 'I2', objectId: 'O3', instanceName: 'Plaque A2', comments: '', dedication: 'In Memory of Robert J. Kearns', specificLocation: 'Panel A, Top Row', engravingLine1: 'ROBERT J. KEARNS', engravingLine2: '1944-2019', section: 'Panel A', row: '1', sequence: '2', pictures: [] },
  { id: 'I3', objectId: 'O3', instanceName: 'Plaque A3', comments: 'Sold, awaiting engraving proof.', dedication: 'The Alvarez-Reyes Family', specificLocation: 'Panel A, Second Row', engravingLine1: 'THE ALVAREZ-REYES FAMILY', engravingLine2: '', section: 'Panel A', row: '2', sequence: '1', pictures: [] },
  { id: 'I4', objectId: 'O3', instanceName: 'Plaque B1', comments: '', dedication: '', specificLocation: 'Panel B, Top Row', engravingLine1: '', engravingLine2: '', section: 'Panel B', row: '1', sequence: '1', pictures: [] },
  { id: 'I5', objectId: 'O3', instanceName: 'Plaque B2', comments: '', dedication: '', specificLocation: 'Panel B, Top Row', engravingLine1: '', engravingLine2: '', section: 'Panel B', row: '1', sequence: '2', pictures: [] },

  // Healing Garden (O4) — pavers
  { id: 'I6', objectId: 'O4', instanceName: 'Paver 014', comments: '', dedication: 'In Loving Memory of Grandma Ruth', specificLocation: 'Main Path, East Side', engravingLine1: 'GRANDMA RUTH', engravingLine2: 'Forever in Our Hearts', section: 'East Path', row: '2', sequence: '14', pictures: [] },
  { id: 'I7', objectId: 'O4', instanceName: 'Paver 015', comments: '', dedication: 'The Chen Family', specificLocation: 'Main Path, East Side', engravingLine1: 'THE CHEN FAMILY', engravingLine2: '', section: 'East Path', row: '2', sequence: '15', pictures: [] },
  { id: 'I8', objectId: 'O4', instanceName: 'Paver 016', comments: 'Reserved, payment pending.', dedication: '', specificLocation: 'Main Path, East Side', engravingLine1: '', engravingLine2: '', section: 'East Path', row: '2', sequence: '16', pictures: [] },
  { id: 'I9', objectId: 'O4', instanceName: 'Paver 017', comments: '', dedication: '', specificLocation: 'Main Path, West Side', engravingLine1: '', engravingLine2: '', section: 'West Path', row: '1', sequence: '17', pictures: [] },

  // Pediatric Auditorium Seating (O5)
  { id: 'I10', objectId: 'O5', instanceName: 'Seat A-1-04', comments: '', dedication: 'Dr. and Mrs. Patel', specificLocation: 'Section A, Row 1, Seat 4', engravingLine1: 'DR. AND MRS. PATEL', engravingLine2: '', section: 'A', row: '1', sequence: '4', pictures: [] },
  { id: 'I11', objectId: 'O5', instanceName: 'Seat A-1-05', comments: '', dedication: '', specificLocation: 'Section A, Row 1, Seat 5', engravingLine1: '', engravingLine2: '', section: 'A', row: '1', sequence: '5', pictures: [] },
  { id: 'I12', objectId: 'O5', instanceName: 'Seat A-2-01', comments: '', dedication: 'In Honor of Ms. Delgado, Kindergarten Teacher', specificLocation: 'Section A, Row 2, Seat 1', engravingLine1: 'MS. DELGADO', engravingLine2: 'Kindergarten', section: 'A', row: '2', sequence: '1', pictures: [] },
  { id: 'I13', objectId: 'O5', instanceName: 'Seat B-1-10', comments: '', dedication: '', specificLocation: 'Section B, Row 1, Seat 10', engravingLine1: '', engravingLine2: '', section: 'B', row: '1', sequence: '10', pictures: [] },
  { id: 'I14', objectId: 'O5', instanceName: 'Seat B-1-11', comments: 'Damaged plate, needs replacement.', dedication: 'The Nguyen Family', specificLocation: 'Section B, Row 1, Seat 11', engravingLine1: 'THE NGUYEN FAMILY', engravingLine2: '', section: 'B', row: '1', sequence: '11', pictures: [] },
  { id: 'I15', objectId: 'O5', instanceName: 'Seat B-3-02', comments: '', dedication: '', specificLocation: 'Section B, Row 3, Seat 2', engravingLine1: '', engravingLine2: '', section: 'B', row: '3', sequence: '2', pictures: [] },

  // Memorial Tree Grove (O10)
  { id: 'I16', objectId: 'O10', instanceName: 'Tree 03 - Red Maple', comments: '', dedication: 'In Memory of James "Jim" Sullivan', specificLocation: 'South Lawn, Path Marker 3', engravingLine1: 'JAMES "JIM" SULLIVAN', engravingLine2: '1958-2023', section: 'South Lawn', row: '', sequence: '3', pictures: [] },
  { id: 'I17', objectId: 'O10', instanceName: 'Tree 04 - Dogwood', comments: '', dedication: '', specificLocation: 'South Lawn, Path Marker 4', engravingLine1: '', engravingLine2: '', section: 'South Lawn', row: '', sequence: '4', pictures: [] },
  { id: 'I18', objectId: 'O10', instanceName: 'Tree 05 - White Oak', comments: '', dedication: 'The Fitzgerald Family', specificLocation: 'South Lawn, Path Marker 5', engravingLine1: 'THE FITZGERALD FAMILY', engravingLine2: '', section: 'South Lawn', row: '', sequence: '5', pictures: [] },
];

const SEED_ACTION_LISTS = [
  {
    id: 'AL1', name: "Today's Field Visit",
    items: [
      { kind: 'object', id: 'O1' },
      { kind: 'object', id: 'O3' },
      { kind: 'object', id: 'O6' },
    ],
  },
  {
    id: 'AL2', name: 'Follow-Up Needed',
    items: [
      { kind: 'instance', id: 'I3' },
      { kind: 'instance', id: 'I8' },
      { kind: 'instance', id: 'I14' },
    ],
  },
];

const SEED_NOTES = [
  { id: 'N1', parentType: 'object', parentId: 'O1', subject: 'Site visit', comments: 'Confirmed signage plans with facilities. Donor plaque should be brushed metal to match lobby finish.', date: '2026-07-28' },
  { id: 'N2', parentType: 'object', parentId: 'O6', subject: 'Family walkthrough', comments: 'Family requested to see mockup rendering before finalizing.', date: '2026-08-02' },
  { id: 'N3', parentType: 'instance', parentId: 'I3', subject: 'Proof approval', comments: 'Waiting on family sign-off for engraving proof v2.', date: '2026-08-10' },
];

const SEED_TASKS = [
  { id: 'T1', parentType: 'object', parentId: 'O1', name: 'Confirm signage placement', description: 'Walk the lobby with facilities to finalize plaque location.', assignee: 'Field Admin', dateAssigned: '2026-08-05', status: 'Open', comments: '' },
  { id: 'T2', parentType: 'object', parentId: 'O6', name: 'Send mockup rendering', description: 'Email rendering to the family for approval.', assignee: 'Field Admin', dateAssigned: '2026-08-06', status: 'In Progress', comments: '' },
  { id: 'T3', parentType: 'instance', parentId: 'I3', name: 'Follow up on proof approval', description: 'Call family for sign-off on engraving proof v2.', assignee: 'Field Admin', dateAssigned: '2026-08-11', status: 'Open', comments: '' },
  { id: 'T4', parentType: 'instance', parentId: 'I14', name: 'Order replacement plate', description: 'Damaged seat plate needs to be reordered from vendor.', assignee: 'Field Admin', dateAssigned: '2026-07-30', status: 'Complete', comments: 'Ordered 8/1, arriving next week.' },
  { id: 'T5', parentType: 'object', parentId: 'O3', name: 'Photograph completed panels', description: 'Take updated photos of Panel A for the donor report.', assignee: 'Field Admin', dateAssigned: '2026-08-09', status: 'Open', comments: '' },
];

const SEED_TASK_TEMPLATES = [
  { id: 'TT1', name: 'Take verification photo', description: 'Photograph the installed plaque/marker to confirm it matches the order.', assignee: 'Field Admin' },
  { id: 'TT2', name: 'Verify engraving text', description: 'Read engraving aloud and confirm it matches the approved proof.', assignee: 'Field Admin' },
  { id: 'TT3', name: 'Report damage', description: 'Log damage or wear and flag for repair/replacement.', assignee: 'Field Admin' },
  { id: 'TT4', name: 'Follow up with donor', description: 'Call or email the donor with a status update.', assignee: 'Field Admin' },
];
