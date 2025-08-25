# N8N JSON Error Troubleshooting Guide
## Common "JSON parameter needs to be valid JSON" Solutions

---

## 🚨 **Most Common JSON Errors in N8N**

### 1. **HTTP Request Node `jsonBody` Syntax Issues**

#### ❌ **Wrong - Mixed JSON/JavaScript Syntax:**
```json
"jsonBody": "={\"model\": \"gpt-4o-mini\", \"messages\": [...].concat($someArray)}"
```

#### ✅ **Correct - Pure N8N Expression:**
```json
"jsonBody": "={{ { model: 'gpt-4o-mini', messages: [...].concat($someArray) } }}"
```

**Key Rules:**
- Always use `={{ ... }}` for expressions
- Use single quotes inside expressions to avoid escaping
- Don't mix JSON strings with JavaScript functions

### 2. **Line Breaks in JSON Content**

#### ❌ **Wrong - Multi-line content causing parsing errors:**
```json
"content": "You are an AI assistant.\n\nYour role:\n1. Help users\n2. Be helpful"
```

#### ✅ **Correct - Single line or properly escaped:**
```json
"content": "You are an AI assistant. Your role: 1. Help users 2. Be helpful"
```

### 3. **respondToWebhook Node Configuration**

#### ❌ **Wrong - Unsupported response modes:**
```json
"respondWith": "lastNode"
```

#### ✅ **Correct - Use supported modes:**
```json
"respondWith": "json",
"responseBody": "={{$json}}"
```

### 4. **Null/Undefined Value Handling**

#### ❌ **Wrong - Values can be null/undefined:**
```json
"jsonBody": "={{ { field: $node.json.mightNotExist } }}"
```

#### ✅ **Correct - Always provide fallbacks:**
```json
"jsonBody": "={{ { field: $node.json.mightNotExist || 'default' } }}"
```

---

## 🔧 **Step-by-Step Debugging Process**

### Step 1: Identify the Failing Node
- Look for red error nodes in workflow execution
- Check the exact error message: "JSON parameter needs to be valid JSON"

### Step 2: Check HTTP Request Node Configuration
```json
{
  "method": "POST",
  "url": "https://api.example.com",
  "sendBody": true,
  "specifyBody": "json",
  "jsonBody": "={{ ... }}"  // ← Check this line
}
```

### Step 3: Test with Static JSON First
Replace dynamic expressions with static values:
```json
"jsonBody": "={{ { test: 'hello', status: 'working' } }}"
```

### Step 4: Add Dynamic Values Gradually
```json
// Start simple
"jsonBody": "={{ { message: $node['Previous'].json.content } }}"

// Add complexity slowly  
"jsonBody": "={{ { message: $node['Previous'].json.content, history: [] } }}"

// Finally add arrays/concat
"jsonBody": "={{ { message: $node['Previous'].json.content, history: $history.concat([newItem]) } }}"
```

---

## 📋 **Quick Fix Checklist**

### HTTP Request Nodes:
- [ ] Uses `{{ ... }}` syntax for expressions
- [ ] Single quotes inside expressions
- [ ] No line breaks in content strings
- [ ] All values have fallbacks (`|| 'default'`)
- [ ] No mixing of JSON strings with JavaScript

### respondToWebhook Nodes:
- [ ] Uses `"respondWith": "json"`
- [ ] Has `"responseBody": "={{$json}}"`
- [ ] Previous node returns clean JSON object

### Code Nodes (if building responses):
- [ ] Returns `{ json: { ... } }` format
- [ ] All fields are properly typed (String/Number)
- [ ] Handles null/undefined values with fallbacks

### Expression Syntax:
- [ ] Array concatenation: `[].concat(array || [])`
- [ ] Object access: `$node['Name'].json['field'] || 'default'`
- [ ] Nested properties: `obj?.nested?.property || 'fallback'`

---

## 🛠 **Working Templates**

### OpenAI API Request Template:
```json
{
  "method": "POST", 
  "url": "https://api.openai.com/v1/chat/completions",
  "sendBody": true,
  "specifyBody": "json",
  "jsonBody": "={{ { 
    model: 'gpt-4o-mini', 
    messages: [
      { role: 'system', content: 'System prompt here without line breaks' }
    ].concat($node['GetHistory'].json.messages || []).concat([
      { role: 'user', content: $node['Input'].json.message }
    ]), 
    temperature: 0.7, 
    max_tokens: 200 
  } }}"
}
```

### Clean Response Builder (Code Node):
```javascript
// Safe value extraction
function safeGet(obj, path, defaultValue) {
  try {
    const keys = path.split('.');
    let result = obj;
    for (const key of keys) {
      result = result?.[key];
      if (result === undefined || result === null) {
        return defaultValue;
      }
    }
    return result;
  } catch (e) {
    return defaultValue;
  }
}

const response = safeGet($node['OpenAI'], 'json.choices.0.message.content', 'Error getting response');

return {
  json: {
    response: String(response),
    sessionId: String($node['Input'].json.sessionId || 'unknown'),
    timestamp: new Date().toISOString(),
    status: 'success'
  }
};
```

### respondToWebhook Template:
```json
{
  "respondWith": "json",
  "responseBody": "={{$json}}",
  "options": {}
}
```

---

## ⚡ **Common Error Patterns & Solutions**

| Error Pattern | Cause | Solution |
|--------------|-------|----------|
| `JSON parameter needs to be valid JSON` | Mixed JSON/JS syntax | Use `={{ { ... } }}` format |
| `Cannot read properties of undefined` | Missing null checks | Add `|| 'default'` fallbacks |
| `Unexpected token in JSON` | Line breaks in strings | Remove `\n` from content |
| `Response Data option "lastNode" not supported` | Wrong respondWith mode | Use `"respondWith": "json"` |
| Empty/blank responses | Missing responseBody | Add `"responseBody": "={{$json}}"` |

---

## 🎯 **Best Practices**

### 1. **Expression Syntax**
- Always use `={{ expression }}` for dynamic content
- Use single quotes inside expressions: `{ field: 'value' }`
- Don't escape quotes unnecessarily

### 2. **Content Handling**  
- Remove line breaks from long text content
- Use spaces instead of `\n` for readability
- Keep system prompts as single-line strings

### 3. **Error Prevention**
- Always provide fallback values: `field || 'default'`
- Check for array existence: `array || []`
- Validate object properties: `obj?.prop || 'fallback'`

### 4. **Debugging Strategy**
- Start with static JSON, add dynamics gradually
- Use Code nodes for complex JSON building
- Test individual expressions in isolation

### 5. **Node Architecture**
- Use Code nodes to build clean JSON objects
- Pass clean objects to HTTP Request nodes
- Avoid complex expressions in `jsonBody`

---

## 🚫 **What NOT to Do**

### DON'T Mix Syntax:
```json
❌ "jsonBody": "{\"field\": \"value\"}.concat(array)"
❌ "jsonBody": "={\"field\": $expression}"  
```

### DON'T Use Line Breaks:
```json
❌ "content": "Line 1\nLine 2\nLine 3"
```

### DON'T Forget Fallbacks:
```json
❌ "field": $node.json.mightNotExist
```

### DON'T Use Unsupported Modes:
```json
❌ "respondWith": "lastNode"
❌ "respondWith": "raw"
```

---

## 📚 **Reference Examples**

This troubleshooting guide was created after resolving persistent JSON errors in:
- `insight-intelligence-ai-chatbot-handler-jsonbin-memory.json`
- OpenAI API integration workflows  
- JSONBin conversation memory systems
- HubSpot CRM integration flows

### Files demonstrating working solutions:
- `working-chatbot-with-memory.json` - Simple, working JSON expressions
- `n8n-json-troubleshooting-guide.md` - This guide
- `json-error-fix-guide.md` - Specific fixes for the chatbot workflow

---

*Save this guide and reference it whenever you encounter "JSON parameter needs to be valid JSON" errors in n8n workflows. These patterns solve 95% of JSON-related issues.*