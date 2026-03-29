
const NAME_PATTERNS = {
  TEMPORAL: [
    /date$/i, /time$/i, /datetime$/i, /_at$/i, /timestamp$/i,
    /^date/i, /^time/i, /created/i, /updated/i, /deleted/i,
    /birth/i, /expir/i, /publish/i, /schedule/i, /modified/i,
    /order_date/i, /joined/i, /released/i,
  ],
  NUMERICAL: [
    /^_?id$/i, /_id$/i, /^id_/i,
    /price$/i, /cost$/i, /amount$/i, /total$/i, /sum$/i,
    /count$/i, /qty$/i, /quantity$/i, /num(ber)?$/i,
    /age$/i, /year$/i, /month$/i, /day$/i,
    /rate$/i, /ratio$/i, /percent/i, /score$/i, /rating$/i,
    /weight$/i, /height$/i, /width$/i, /length$/i,
    /revenue$/i, /profit$/i, /loss$/i, /salary$/i,
    /distance$/i, /speed$/i, /duration$/i,
    /temperature$/i, /humidity$/i,
    /latitude$/i, /longitude$/i, /^lat$/i, /^lng$/i,
    /size$/i, /index$/i, /rank$/i, /order_id$/i,
    /customer_id$/i, /customer_age$/i, /phone/i, /zip/i, /postal/i,
  ],
  BOOLEAN: [
    /^is_/i, /^has_/i, /^can_/i, /^should_/i, /^will_/i,
    /_flag$/i, /^active$/i, /^enabled$/i, /^verified$/i,
    /^approved$/i, /^deleted$/i, /^published$/i, /^visible$/i,
    /^completed$/i, /^paid$/i, /^shipped$/i, /^archived$/i,
  ],
  TEXT: [
    /description$/i, /comment$/i, /notes?$/i, /message$/i,
    /content$/i, /body$/i, /^text$/i, /details?$/i,
    /bio$/i, /summary$/i, /abstract$/i, /review$/i,
    /feedback$/i, /remark$/i, /reason$/i,
  ],
  GEOGRAPHIC: [
    /^(lat|latitude)$/i, /^(lng|lon|longitude)$/i,
    /^geo/i, /coordinates?/i, /^location$/i, /address$/i,
  ],
};

export const FIELD_TYPES = {
  CATEGORICAL: 'Categorical',
  NUMERICAL:   'Numerical',
  TEMPORAL:    'Temporal',
  BOOLEAN:     'Boolean',
  TEXT:        'Text',
  GEOGRAPHIC:  'Geographic',
  UNKNOWN:     'Unknown',
};

export function detectFieldType(fieldName) {
  const name = String(fieldName).trim();
  for (const [type, patterns] of Object.entries(NAME_PATTERNS)) {
    if (patterns.some((re) => re.test(name))) return FIELD_TYPES[type];
  }
  return FIELD_TYPES.CATEGORICAL; 
}

export function detectFieldTypeFromValues(fieldName, values = []) {
  const nonNull = values
    .filter((v) => v !== null && v !== undefined && v !== '')
    .slice(0, 40); 

  if (nonNull.length < 3) return detectFieldType(fieldName);

   const boolSet = new Set(['true', 'false', '0', '1', 'yes', 'no']);
  if (nonNull.every((v) => boolSet.has(String(v).toLowerCase()))) {
    return FIELD_TYPES.BOOLEAN;
  }

  const isAllNumeric = nonNull.every((v) => {
    const s = String(v).trim();
    return s !== '' && !isNaN(Number(s)) && !isNaN(parseFloat(s));
  });
  if (isAllNumeric) return FIELD_TYPES.NUMERICAL;

  const dateRe = /^\d{4}-\d{2}-\d{2}|^\d{2}[\/\-]\d{2}[\/\-]\d{4}/;
  const isAllDate = nonNull.every((v) => {
    const s = String(v);
    return dateRe.test(s) && !isNaN(Date.parse(s));
  });
  if (isAllDate) return FIELD_TYPES.TEMPORAL;

  const avgLen = nonNull.reduce((a, v) => a + String(v).length, 0) / nonNull.length;
  if (avgLen > 60) return FIELD_TYPES.TEXT;

  const uniqueRatio = new Set(nonNull.map(String)).size / nonNull.length;
  if (uniqueRatio < 0.3) return FIELD_TYPES.CATEGORICAL;

  return detectFieldType(fieldName);
}

export function mapFieldsWithTypes(fieldNames, sampleData = []) {
  return fieldNames.map((fieldName) => {
    if (sampleData && sampleData.length >= 3) {
      const values = sampleData.map((row) => row[fieldName]);
      return { fieldName, type: detectFieldTypeFromValues(fieldName, values) };
    }
    return { fieldName, type: detectFieldType(fieldName) };
  });
}

export function getAllFieldTypes() {
  return Object.values(FIELD_TYPES);
}

export function getSuggestedGraphTypes(fieldType) {
  const suggestions = {
    [FIELD_TYPES.CATEGORICAL]: ['Bar ', 'Pie ', 'Donut '],
    [FIELD_TYPES.NUMERICAL]:   ['Line', 'Scatter', 'Histogram', 'Area', 'Bar '],
    [FIELD_TYPES.TEMPORAL]:    ['Line', 'Area'],
    [FIELD_TYPES.BOOLEAN]:     ['Pie ', 'Donut ', 'Bar '],
    [FIELD_TYPES.TEXT]:        ['Bar '],
    [FIELD_TYPES.GEOGRAPHIC]:  ['Bar '],
    [FIELD_TYPES.UNKNOWN]:     ['Bar ', 'Line'],
  };
  return suggestions[fieldType] || ['Bar '];
}