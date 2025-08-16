# MedXam Scorer Functionality Documentation

## Overview
The MedXam system provides a comprehensive scoring interface for committee members and scorers to evaluate participant exam attempts after delivery completion.

## System Architecture

### User Roles
- **Administrator**: Full system access, can manage all aspects
- **Committee/Scorer**: Can access scoring functionality for assigned deliveries
- **Participant**: Takes exams (no scoring access)

## Scoring Workflow

### 1. Accessing the Scoring Interface

#### Login Process
- Navigate to the main URL: `http://io844g808o48ccsoscc888s0.107.155.75.50.sslip.io`
- Click on "Committee Login" or use `/login` for direct access
- Enter committee/scorer credentials

#### Available URLs
- **Scoring Dashboard**: `/back-office/scoring`
- **Delivery Scoring Details**: `/back-office/scoring/{deliveryId}`
- **Individual Participant Scoring**: `/back-office/scoring/{deliveryId}/exam/{attemptId}`

### 2. Scoring Dashboard

The main scoring page displays all deliveries that are available for scoring:

**Features:**
- Search by delivery name
- Date range filtering
- Paginated list of deliveries
- Status indicators showing scoring progress

**Information Displayed:**
- Delivery name
- Number of takers (participants)
- Number of questions
- Schedule date and time
- Duration
- Current status (Scoring/Completed)
- Edit button to access scoring details

### 3. Delivery Scoring Details

When clicking on a delivery, scorers see:

**Summary Statistics:**
- Total scoring tasks
- Number of takers
- Total questions

**Participant List Table:**
- Participant code/ID
- Progress percentage
- Attempt timestamp
- Scoring status (Not finished yet/Completed)
- Current score
- Action buttons:
  - PDF download (exam and answers)
  - Edit/View scoring interface

### 4. Individual Question Scoring Interface

This is where the actual scoring happens for each participant:

**Header Information:**
- Delivery name
- Participant code
- Attempt timestamp
- Close Scoring button
- Navigation arrows

**Question Display:**
- Question number (e.g., "1.1")
- "Show Live Question" button for reference
- Status indicator (answered/not answered)
- Full question text with any images
- Multiple choice options (A, B, C, D, E)
- Correct answer marked (green checkmark)
- Participant's answer (if any)

**Scoring Controls:**
- Previous/Next navigation buttons
- Question navigation dropdown
- "Finish & Recalculate Score" button to save scores

## Scoring Process

### Automatic Scoring
For multiple choice questions (MCQ):
- System automatically calculates scores based on correct answers
- Score displayed as points (e.g., "1.11")

### Manual Scoring
For essay or open-ended questions:
- Scorer reviews participant's answer
- Assigns points based on rubric
- Can override automatic scores if needed

### Score Calculation
- Each question has assigned point values
- Total score calculated as sum of all question scores
- Percentage calculated based on total possible points

## Database Structure

### Key Tables
- `deliveries`: Exam delivery instances
- `attempts`: Participant exam attempts
- `attempt_questions`: Individual question answers
- `users`: System users including scorers

### Scoring Status Flow
1. **Not Started**: Participant hasn't begun exam
2. **In Progress**: Participant currently taking exam
3. **Completed**: Exam finished, ready for scoring
4. **Scored**: Scoring completed

## Technical Implementation

### Backend APIs
- `GET /api/deliveries/{id}/attempts` - List attempts for a delivery
- `GET /api/attempts/{id}/answers` - Get participant answers
- `PUT /api/attempts/{id}/score` - Update attempt score
- `GET /api/deliveries/{id}/results` - Get delivery results

### Frontend Components
- Scoring dashboard (list view)
- Delivery detail view
- Question scoring interface
- Score calculation engine

## Current System Status

### Working Features
- Delivery listing with scoring status
- Participant attempt viewing
- Question-by-question navigation
- Score display

### Known Issues
- WebSocket connection errors (non-critical)
- Some API endpoints return 500 errors
- Frontend uses some mock data instead of live API calls

## Best Practices for Scorers

1. **Review All Questions**: Navigate through all questions even if auto-scored
2. **Check Participant Status**: Ensure exam was completed before scoring
3. **Use Navigation**: Use Previous/Next buttons to review systematically
4. **Save Progress**: Click "Finish & Recalculate Score" to save
5. **Download Reports**: Use PDF download for record keeping

## Security Considerations

- Role-based access control (RBAC)
- Session-based authentication
- Audit trail for score changes
- No participant data exposure to unauthorized users

## Future Enhancements

1. **Bulk Scoring**: Score multiple participants simultaneously
2. **Scoring Templates**: Save scoring rubrics for reuse
3. **Inter-rater Reliability**: Multiple scorers per attempt
4. **Analytics Dashboard**: Scoring statistics and trends
5. **API Integration**: Complete frontend-backend integration
6. **Real-time Updates**: WebSocket for live scoring updates

## Troubleshooting

### Common Issues

**Cannot Login as Scorer:**
- Verify user has committee/scorer role
- Check password is correctly hashed with bcrypt
- Ensure database connection is active

**Scoring Page Not Loading:**
- Check delivery has completed status
- Verify participant attempts exist
- Clear browser cache

**Scores Not Saving:**
- Ensure proper authentication
- Check network connectivity
- Verify API endpoints are responding

## Conclusion

The MedXam scoring system provides a comprehensive interface for evaluating participant exam attempts. While some technical improvements are needed for full API integration, the core functionality allows scorers to review answers, assign scores, and generate results effectively.