# N8N IF Node Troubleshooting Guide

## Critical Structure Requirements for N8N IF Nodes

### ✅ Correct IF Node Structure

```json
{
  "parameters": {
    "conditions": {
      "options": {
        "caseSensitive": true,
        "leftValue": "",
        "typeValidation": "strict"
      },
      "conditions": [
        {
          "id": "condition-name",
          "leftValue": "={{$json.someValue}}",
          "rightValue": true,
          "operator": {
            "type": "boolean",
            "operation": "equal"
          }
        }
      ],
      "combinator": "and"
    },
    "options": {}
  },
  "id": "unique-node-id",
  "name": "IF Node Name",
  "type": "n8n-nodes-base.if",
  "typeVersion": 2
}
```

### ❌ Common Mistakes That Break IF Nodes

#### 1. Wrong Parameter Names
```json
// ❌ WRONG - Will cause "no conditions" in UI
"combineOperation": "all"

// ✅ CORRECT
"combinator": "and"
```

#### 2. Wrong Options Structure
```json
// ❌ WRONG - Will cause "Cannot read properties of undefined (reading 'caseSensitive')"
"conditions": {
  "caseSensitive": true,
  "typeValidation": "strict",
  "conditions": [...]
}

// ✅ CORRECT - Options must be nested
"conditions": {
  "options": {
    "caseSensitive": true,
    "leftValue": "",
    "typeValidation": "strict"
  },
  "conditions": [...]
}
```

#### 3. Missing Required Fields
```json
// ❌ WRONG - Missing required fields
"conditions": [
  {
    "leftValue": "={{$json.value}}",
    "rightValue": true
  }
]

// ✅ CORRECT - Must include id and operator
"conditions": [
  {
    "id": "unique-condition-id",
    "leftValue": "={{$json.value}}",
    "rightValue": true,
    "operator": {
      "type": "boolean",
      "operation": "equal"
    }
  }
]
```

## Error Messages and Solutions

### "Cannot read properties of undefined (reading 'caseSensitive')"
**Cause**: `caseSensitive` is not inside the `options` object  
**Solution**: Move `caseSensitive`, `leftValue`, and `typeValidation` into `options` object

### "No conditions visible in n8n UI"
**Cause**: Using wrong parameter names like `combineOperation` instead of `combinator`  
**Solution**: Use correct parameter name `"combinator": "and"`

### "Try changing the type of comparison"
**Cause**: Operator type mismatch or malformed condition structure  
**Solution**: Ensure operator matches data type:
- Boolean: `{"type": "boolean", "operation": "equal"}`
- String: `{"type": "string", "operation": "equals"}` or `{"type": "string", "operation": "regex"}`
- Number: `{"type": "number", "operation": "equal"}`

## Working Examples by Data Type

### Boolean Comparison
```json
{
  "id": "boolean-check",
  "leftValue": "={{$json.isHighIntentLead}}",
  "rightValue": true,
  "operator": {
    "type": "boolean",
    "operation": "equal"
  }
}
```

### String Comparison
```json
{
  "id": "string-check",
  "leftValue": "={{$json.status}}",
  "rightValue": "completed",
  "operator": {
    "type": "string",
    "operation": "equals"
  }
}
```

### Regex Matching
```json
{
  "id": "regex-check",
  "leftValue": "={{$node['Extract Message Data'].json['message']}}",
  "rightValue": "([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})",
  "operator": {
    "type": "string",
    "operation": "regex"
  }
}
```

### Number Comparison
```json
{
  "id": "number-check",
  "leftValue": "={{$json.count}}",
  "rightValue": 5,
  "operator": {
    "type": "number",
    "operation": "larger"
  }
}
```

## Multiple Conditions

```json
"conditions": {
  "options": {
    "caseSensitive": true,
    "leftValue": "",
    "typeValidation": "strict"
  },
  "conditions": [
    {
      "id": "first-condition",
      "leftValue": "={{$json.isHighIntentLead}}",
      "rightValue": true,
      "operator": {
        "type": "boolean",
        "operation": "equal"
      }
    },
    {
      "id": "second-condition", 
      "leftValue": "={{$json.hasEmail}}",
      "rightValue": true,
      "operator": {
        "type": "boolean",
        "operation": "equal"
      }
    }
  ],
  "combinator": "and"
}
```

## Debugging Workflow

1. **Check Parameter Names**: Ensure `combinator` not `combineOperation`
2. **Verify Options Structure**: `caseSensitive` must be in `options` object
3. **Validate Condition Fields**: Each condition needs `id`, `leftValue`, `rightValue`, `operator`
4. **Test Operator Types**: Match operator type to data type being compared
5. **Check Node References**: Ensure referenced nodes exist in execution path
6. **Use Working Examples**: Copy structure from working IF nodes in other workflows

## Reference Files

- **Working Example**: `demo-form-call-submission.json` (contains properly structured IF nodes)
- **Main Implementation**: `insight-intelligence-ai-chatbot-handler-jsonbin-memory.json`

## Key Takeaways

1. **Always use correct parameter names**: `combinator` not `combineOperation`
2. **Nest options properly**: `caseSensitive` goes in `options` object
3. **Include all required fields**: `id`, `leftValue`, `rightValue`, `operator`
4. **Match operator types**: Boolean, string, number operators must match data types
5. **Copy from working examples**: Don't guess the structure - use proven patterns

This structure is consistent across n8n versions and should prevent future IF node issues.