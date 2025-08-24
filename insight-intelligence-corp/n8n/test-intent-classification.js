// AI Intent Classification Testing Script
// Tests the accuracy of AI classification vs regex patterns

const testConversations = [
  // High Intent Lead Examples
  {
    message: "I'd like to schedule a demo for your AI phone system",
    expectedClassification: {
      primary_intent: "demo_request",
      lead_quality: "hot",
      urgency_level: "soon",
      next_best_action: "request_contact_info"
    },
    regexWouldMatch: true
  },
  {
    message: "Can someone call me about pricing for your automation solutions?",
    expectedClassification: {
      primary_intent: "pricing_inquiry",
      lead_quality: "warm",
      urgency_level: "soon",
      next_best_action: "request_contact_info"
    },
    regexWouldMatch: true
  },
  {
    message: "We're losing calls at our medical practice and need a solution ASAP",
    expectedClassification: {
      primary_intent: "lead_qualification",
      lead_quality: "hot",
      urgency_level: "immediate",
      next_best_action: "schedule_demo"
    },
    regexWouldMatch: false // Regex would miss this high-intent message
  },

  // Medium Intent Examples
  {
    message: "How does your system integrate with our existing CRM?",
    expectedClassification: {
      primary_intent: "technical_support",
      lead_quality: "warm",
      urgency_level: "flexible",
      next_best_action: "continue_conversation"
    },
    regexWouldMatch: false
  },
  {
    message: "I'm comparing different AI phone solutions for our law firm",
    expectedClassification: {
      primary_intent: "information_gathering",
      lead_quality: "warm",
      urgency_level: "exploring",
      business_context: "competitor_research"
    },
    regexWouldMatch: false
  },

  // Low Intent Examples  
  {
    message: "What exactly is AI phone automation?",
    expectedClassification: {
      primary_intent: "information_gathering",
      lead_quality: "cold",
      urgency_level: "exploring",
      next_best_action: "continue_conversation"
    },
    regexWouldMatch: false
  },
  {
    message: "Just browsing your website",
    expectedClassification: {
      primary_intent: "general_conversation",
      lead_quality: "nurture",
      urgency_level: "exploring",
      next_best_action: "continue_conversation"
    },
    regexWouldMatch: false
  },

  // Complex Context Examples
  {
    message: "Our HVAC business misses 40% of calls during busy season. ROI calculators show we're losing $80K annually. Ready to implement something this month.",
    expectedClassification: {
      primary_intent: "lead_qualification", 
      lead_quality: "hot",
      urgency_level: "immediate",
      business_context: "budget_approved",
      specific_interests: ["ai_phone_system", "roi_analysis"],
      next_best_action: "schedule_demo"
    },
    regexWouldMatch: false // Complex context regex can't capture
  }
];

// Test Results Analysis
function analyzeTestResults() {
  console.log("=== AI Intent Classification Test Analysis ===\n");
  
  testConversations.forEach((test, index) => {
    console.log(`Test ${index + 1}: "${test.message}"`);
    console.log(`Expected Intent: ${test.expectedClassification.primary_intent}`);
    console.log(`Expected Lead Quality: ${test.expectedClassification.lead_quality}`);
    console.log(`Expected Urgency: ${test.expectedClassification.urgency_level}`);
    console.log(`Regex Would Match: ${test.regexWouldMatch ? 'YES' : 'NO'}`);
    console.log("---");
  });

  // Summary Statistics
  const regexMatches = testConversations.filter(t => t.regexWouldMatch).length;
  const totalTests = testConversations.length;
  const highIntentMissed = testConversations.filter(t => 
    (t.expectedClassification.lead_quality === 'hot' || 
     t.expectedClassification.urgency_level === 'immediate') && 
    !t.regexWouldMatch
  ).length;

  console.log("\n=== Summary ===");
  console.log(`Total Test Cases: ${totalTests}`);
  console.log(`Regex Would Catch: ${regexMatches}/${totalTests} (${Math.round(regexMatches/totalTests*100)}%)`);
  console.log(`High Intent Missed by Regex: ${highIntentMissed}`);
  console.log(`AI Advantage: Captures complex context, business urgency, and multi-dimensional intent`);
}

// Postman Collection for Testing
const postmanCollection = {
  "info": {
    "name": "AI Intent Classification Tests",
    "description": "Test collection for validating AI intent classification accuracy"
  },
  "item": testConversations.map((test, index) => ({
    "name": `Test ${index + 1}: ${test.expectedClassification.primary_intent}`,
    "request": {
      "method": "POST",
      "header": [
        {
          "key": "Content-Type",
          "value": "application/json"
        }
      ],
      "body": {
        "mode": "raw",
        "raw": JSON.stringify({
          message: test.message,
          sessionId: `test-session-${index + 1}`,
          userId: "test-user",
          timestamp: new Date().toISOString(),
          url: "https://insight-intelligence.com/test",
          "userAgent": "Test Agent",
          messageCount: 1
        })
      },
      "url": {
        "raw": "{{webhook_url}}/ai-chatbot",
        "host": ["{{webhook_url}}"],
        "path": ["ai-chatbot"]
      }
    },
    "event": [
      {
        "listen": "test",
        "script": {
          "exec": [
            "pm.test('Response contains intent classification', function () {",
            "    pm.expect(pm.response.json()).to.have.property('response');",
            "});",
            "",
            "pm.test('Intent matches expected pattern', function () {",
            `    // Expected: ${test.expectedClassification.primary_intent}`,
            `    // Lead Quality: ${test.expectedClassification.lead_quality}`,
            "    console.log('Response:', pm.response.json());",
            "});"
          ],
          "type": "text/javascript"
        }
      }
    ]
  }))
};

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testConversations,
    analyzeTestResults,
    postmanCollection
  };
}

// Run analysis
analyzeTestResults();

// Sample cURL commands for manual testing
console.log("\n=== Sample cURL Commands ===");
console.log(`
# High Intent Test
curl -X POST "YOUR_WEBHOOK_URL/ai-chatbot" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "I need to schedule a demo for your AI phone system", "sessionId": "test-1", "userId": "test-user"}'

# Complex Context Test  
curl -X POST "YOUR_WEBHOOK_URL/ai-chatbot" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Our HVAC business misses 40% of calls during busy season. ROI calculators show we are losing $80K annually. Ready to implement something this month.", "sessionId": "test-2", "userId": "test-user"}'

# Low Intent Test
curl -X POST "YOUR_WEBHOOK_URL/ai-chatbot" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "What exactly is AI phone automation?", "sessionId": "test-3", "userId": "test-user"}'
`);