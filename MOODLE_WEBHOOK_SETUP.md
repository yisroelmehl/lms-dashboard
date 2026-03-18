# Moodle Service Request Webhook Integration

## Overview

This webhook allows Moodle to automatically create service requests in your LMS dashboard when a student submits a request through Moodle.

## Endpoint

```
POST /api/webhooks/moodle-service-request
```

## Setup Instructions

### Step 1: Set Environment Variable

Add the webhook secret to your `.env.local` or production environment:

```bash
MOODLE_WEBHOOK_SECRET=your_secure_secret_key_here_change_this
```

**Important:** Use a strong, random secret (at least 32 characters)

### Step 2: Configure in Moodle

Unfortunately, Moodle 4.x doesn't have a native "service request" webhook. You'll need one of the following:

#### Option A: Manual Plugin (Custom Development)

If you have a developer, they can create a simple plugin that hooks into the assignment/request submission event and sends data to your webhook.

**Plugin Hook Event Code:**
```php
// In your Moodle plugin
$event_data = [
    'student_id' => $USER->id,
    'student_email' => $USER->email,
    'student_name' => $USER->firstname . ' ' . $USER->lastname,
    'title' => $request_title,
    'description' => $request_description,
    'request_type' => 'other', // or: new_shipment, study_partner, exam_retake, material_request, schedule_change
    'webhook_secret' => getenv('MOODLE_WEBHOOK_SECRET'),
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'YOUR_DOMAIN/api/webhooks/moodle-service-request');
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($event_data));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
$response = curl_exec($ch);
curl_close($ch);
```

#### Option B: zapier/IFTTT Integration

Use Zapier or Make.com to trigger a webhook when a form is submitted in Moodle.

#### Option C: Manual CSV Import

Export service requests from Moodle as CSV and import via your LMS dashboard.

### Step 3: Test the Webhook

```bash
curl -X POST http://localhost:3000/api/webhooks/moodle-service-request \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "12345",
    "student_email": "student@example.com",
    "student_name": "John Doe",
    "title": "Need extra materials",
    "description": "I need copies of the first chapter",
    "request_type": "material_request",
    "webhook_secret": "your_secure_secret_key_here_change_this"
  }'
```

Expected response:
```json
{
  "success": true,
  "request_id": "abc123def456",
  "message": "Service request created successfully"
}
```

## Payload Format

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `student_id` | integer | ✅ | Moodle user ID |
| `student_email` | string | ✅ | Student email |
| `student_name` | string | ✅ | Full name |
| `title` | string | ✅ | Request title |
| `description` | string | ❌ | Detailed description |
| `request_type` | string | ❌ | One of: `new_shipment`, `study_partner`, `exam_retake`, `material_request`, `schedule_change`, `other` |
| `webhook_secret` | string | ✅ | Secret for validation |

## Request Types

- `new_shipment` - Request for new materials/resources
- `study_partner` - Request to find a study partner
- `exam_retake` - Request to retake an exam
- `material_request` - Request for physical/digital materials
- `schedule_change` - Request to change class schedule
- `other` - Other types of requests

## What Happens After

1. ✅ Request is validated and stored in the dashboard
2. ✅ Student name is automatically identified or created if new
3. ✅ Request appears in the admin panel under "Service Requests"
4. ✅ Admin can see who submitted it and from where (marked as "Moodle")
5. ✅ Admin can respond/resolve the request

## Security Notes

- Always use HTTPS in production
- Webhook secret is NOT saved in the database, only verified at time of receipt
- Requests without valid secret are rejected with 401
- Student profiles are created automatically if they don't exist (from Moodle data)
- Never expose YOUR_DOMAIN or webhook secret publicly

## Troubleshooting

### "Invalid webhook secret"
- Check that ENV variable matches what you're sending
- Webhook secret is case-sensitive

### Student not found
- The system creates new students based on Moodle ID
- Make sure Moodle ID is correct integer

### Request not appearing
- Check admin panel "Service Requests" section
- Filter by source "Moodle" to see webhook requests
- Check server logs for errors

## Future Enhancements

- [ ] Email notifications to admins
- [ ] Automatic request assignment based on type
- [ ] SMS notifications
- [ ] Two-way sync (send updates back to Moodle)
