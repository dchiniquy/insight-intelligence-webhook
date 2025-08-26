#!/usr/bin/env node

/**
 * Test script to validate Ava identity updates
 * Checks both markdown file and n8n workflow configuration
 */

const fs = require('fs');
const path = require('path');

// Test results tracker
let tests = {
    passed: 0,
    failed: 0,
    results: []
};

function test(description, assertion) {
    try {
        if (assertion) {
            tests.passed++;
            tests.results.push(`✅ PASS: ${description}`);
        } else {
            tests.failed++;
            tests.results.push(`❌ FAIL: ${description}`);
        }
    } catch (error) {
        tests.failed++;
        tests.results.push(`❌ ERROR: ${description} - ${error.message}`);
    }
}

// Read and test markdown file
console.log('🔍 Testing ai-chat-agent-identity-v2.md updates...\n');

const markdownPath = './ai-chat-agent-identity-v2.md';
const markdownContent = fs.readFileSync(markdownPath, 'utf8');

// Test markdown updates
test('Agent name changed from Layla to Ava', 
    markdownContent.includes('You are **Ava**') && !markdownContent.includes('You are **Layla**'));

test('Updated positioning to "AI Automation Specialist"',
    markdownContent.includes('Your AI Automation Specialist'));

test('Includes "3 days, not 3 months" messaging',
    markdownContent.includes('3 days, not 3 months'));

test('Updated to $58K+ specific savings',
    markdownContent.includes('$58K+'));

test('Includes 60-80% cost reduction messaging',
    markdownContent.includes('60-80%'));

test('Enhanced medical practice results (40% no-show reduction)',
    markdownContent.includes('40% reduction in no-shows'));

test('Enhanced real estate messaging (5-second response)',
    markdownContent.includes('5-second response time'));

test('Enhanced legal practice messaging (70% admin reduction)',
    markdownContent.includes('70% reduction in administrative tasks'));

// Read and test n8n workflow file
console.log('\n🔍 Testing n8n workflow updates...\n');

const workflowPath = './insight-intelligence-ai-chatbot-handler-jsonbin-memory.json';
const workflowContent = fs.readFileSync(workflowPath, 'utf8');

// Test n8n workflow updates
test('N8N workflow uses Ava name',
    workflowContent.includes('You are Ava') && !workflowContent.includes('You are Layla'));

test('N8N workflow includes "AI Automation Specialist"',
    workflowContent.includes('AI Automation Specialist'));

test('N8N workflow mentions 3-day setup vs competitors',
    workflowContent.includes('3 days vs competitors'));

test('N8N workflow uses $58K+ savings',
    workflowContent.includes('$58K+'));

test('N8N workflow includes 60-80% cost reduction',
    workflowContent.includes('60-80%'));

// Test JSON validity
test('N8N workflow JSON is valid', 
    (() => {
        try {
            JSON.parse(workflowContent);
            return true;
        } catch (e) {
            return false;
        }
    })());

// Display results
console.log('\n📊 Test Results Summary:\n');
tests.results.forEach(result => console.log(result));

console.log(`\n🎯 Overall Results:`);
console.log(`   ✅ Passed: ${tests.passed}`);
console.log(`   ❌ Failed: ${tests.failed}`);
console.log(`   📈 Success Rate: ${Math.round((tests.passed / (tests.passed + tests.failed)) * 100)}%`);

if (tests.failed === 0) {
    console.log('\n🎉 All tests passed! Ava identity update is complete and ready for deployment.');
    process.exit(0);
} else {
    console.log('\n⚠️  Some tests failed. Please review the issues above.');
    process.exit(1);
}