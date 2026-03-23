
const FIELD_TYPE_PATTERNS = {
  CATEGORICAL: [
    'name', 'title', 'category', 'type', 'status', 'color', 'cloth_type', 
    'place', 'country', 'city', 'region', 'state', 'province', 'gender', 
    'department', 'brand', 'model', 'size', 'color', 'grade', 'level',
    'priority', 'class', 'group', 'tag', 'label', 'kind', 'variant',
    'language', 'currency', 'status_label', 'reason', 'cause', 'purpose',
    'product_category'
  ],
  
  NUMERICAL: [
    'price', 'cost', 'amount', 'quantity', 'count', 'total', 'sum',
    'age', 'year', 'month', 'day', 'hour', 'minute', 'second',
    'distance', 'length', 'width', 'height', 'weight', 'volume',
    'revenue', 'sales', 'profit', 'loss', 'percentage', 'ratio',
    'rating', 'score', 'points', 'value', 'number', 'id', 'code',
    'phone', 'zip_code', 'postal_code', 'temperature', 'humidity','order_id','customer_age'
    ,'customer_id'
  ],
  
  // Temporal/Date fields
  TEMPORAL: [
    'date', 'time', 'datetime', 'created_at', 'updated_at', 'deleted_at',
    'start_date', 'end_date', 'birth_date', 'due_date', 'release_date',
    'joined_date', 'published_date', 'modified_date', 'timestamp',
    'start_time', 'end_time', 'scheduled_at', 'expired_at','order_date',
  ],
  
  // Boolean/Binary fields
  BOOLEAN: [
    'active', 'is_active', 'enabled', 'disabled', 'visible', 'is_visible',
    'deleted', 'verified', 'approved', 'confirmed', 'published',
    'available', 'in_stock', 'premium', 'featured', 'flagged',
    'archived', 'processed', 'completed', 'paid', 'shipped',
  ],
  
  TEXT: [
    'description', 'comment', 'feedback', 'notes', 'remarks', 'message',
    'content', 'body', 'text', 'details', 'info', 'information',
    'bio', 'summary', 'abstract', 'review', 'reason',
  ],
  
  GEOGRAPHIC: [
    'latitude', 'longitude', 'lat', 'lng', 'geolocation', 'coordinates',
    'location', 'address', 'street', 'avenue', 'road', 'avenue',
  ],
};

// All available field types
export const FIELD_TYPES = {
  CATEGORICAL: 'Categorical',
  NUMERICAL: 'Numerical',
  TEMPORAL: 'Temporal',
  BOOLEAN: 'Boolean',
  TEXT: 'Text',
  GEOGRAPHIC: 'Geographic',
  UNKNOWN: 'Unknown',
};


export function detectFieldType(fieldName) {
  const lowerFieldName = fieldName.toLowerCase().trim();
  
  // Check each pattern
  for (const [type, patterns] of Object.entries(FIELD_TYPE_PATTERNS)) {
    if (patterns.some(pattern => 
      lowerFieldName === pattern || 
      lowerFieldName.includes(pattern) ||
      pattern.includes(lowerFieldName)
    )) {
      return FIELD_TYPES[type];
    }
  }
  
  return FIELD_TYPES.UNKNOWN;
}


export function getAllFieldTypes() {
  return Object.values(FIELD_TYPES);
}


export function mapFieldsWithTypes(fieldNames) {
  return fieldNames.map(fieldName => ({
    fieldName,
    type: detectFieldType(fieldName),
  }));
}


export function getSuggestedGraphTypes(fieldType) {
  const suggestions = {
    [FIELD_TYPES.CATEGORICAL]: ['Bar Chart', 'Pie Chart', 'Donut Chart', 'Count Plot'],
    [FIELD_TYPES.NUMERICAL]: ['Line Chart', 'Scatter Plot', 'Histogram', 'Box Plot', 'Area Chart'],
    [FIELD_TYPES.TEMPORAL]: ['Line Chart', 'Area Chart', 'Timeline'],
    [FIELD_TYPES.BOOLEAN]: ['Pie Chart', 'Donut Chart', 'Bar Chart'],
    [FIELD_TYPES.TEXT]: ['Word Cloud', 'Tag Cloud'],
    [FIELD_TYPES.GEOGRAPHIC]: ['Map', 'Geo Chart'],
    [FIELD_TYPES.UNKNOWN]: ['Bar Chart', 'Scatter Plot', 'Line Chart'],
  };
  
  return suggestions[fieldType] || suggestions[FIELD_TYPES.UNKNOWN];
}
// export function get
