# Admin Guide: Committee & Scorer Management System

## Overview
This system allows administrators to assign committee members and scorers to exam deliveries, providing role-based access control for exam management and result evaluation.

## User Roles

### Administrator
- **Full system access**
- Can assign committee members and scorers to deliveries
- Can manage all users and settings
- Access via regular admin login at `/login`

### Committee Members
- **Exam delivery management**
- Can start, pause, and stop exam deliveries
- Monitor exam progress
- Access via committee login at `/committee/login`

### Scorers
- **Result evaluation**
- Can score participant answers and add comments
- View detailed participant results
- Access via committee login at `/committee/login`

## Admin Workflow

### 1. Managing Users
Navigate to **Settings > Committee & Scorers** (`/back-office/committee-scorers`)
- View all users with committee/scorer roles
- Search and filter users
- View user capabilities and role information

### 2. Assigning Committee & Scorers to Deliveries

#### Option A: Through Delivery Management
1. Go to **Deliveries** (`/back-office/delivery`)
2. Click on a delivery to view details
3. Navigate to the **"Assignments"** tab
4. Use the "Assign Committee" and "Assign Scorers" buttons
5. Select users from the available list
6. Save assignments

#### Option B: Assignment Overview Dashboard
1. Go to **Assignment Overview** (`/back-office/assignments`)
2. View statistics and recent assignments
3. Click "Manage" on any delivery to modify assignments

### 3. Monitoring Assignments
Use the **Assignment Overview** dashboard to:
- View total delivery and assignment statistics
- Monitor active committee members and scorers
- Quick access to manage specific delivery assignments

## Committee & Scorer Workflow

### For Committee Members
1. Login at `/committee/login` using regular credentials
2. View assigned deliveries on the committee dashboard
3. Use delivery controls (Start/Pause/Stop) as needed
4. Monitor exam progress and participants

### For Scorers
1. Login at `/committee/login` using regular credentials
2. View assigned deliveries on the committee dashboard
3. Click "Score Results" for completed exams
4. Access detailed scoring interface to evaluate participant answers
5. Add scores and comments for each question
6. Results are automatically saved

## Key Features

### Role-Based Access Control
- Committee members can only control deliveries they're assigned to
- Scorers can only access results for deliveries they're assigned to
- Administrators have full access to all functions

### Flexible Assignment System
- Multiple committee members can be assigned to one delivery
- Multiple scorers can be assigned to one delivery
- Users can be assigned to multiple deliveries
- Assignments can be modified at any time

### Real-time Status Updates
- Delivery status updates automatically
- Committee controls reflect current delivery state
- Scoring progress is saved in real-time

## Technical Details

### Database Tables
- `delivery_committee`: Links deliveries to committee members
- `delivery_scorer`: Links deliveries to scorers
- Both tables support assignment history and active status

### API Endpoints
- `/api/deliveries/{id}/assign-committee` - Assign committee members
- `/api/deliveries/{id}/assign-scorers` - Assign scorers
- `/api/deliveries/{id}/assignments` - Get assignments
- `/api/my-deliveries` - Get user's assigned deliveries
- `/api/deliveries/{id}/control` - Committee delivery controls

### User Interface
- **Admin**: Full delivery management with assignment tabs
- **Committee**: Dedicated dashboard with delivery controls
- **Scorer**: Specialized scoring interface with participant selection

## Best Practices

### Assignment Guidelines
1. Assign committee members before exam start time
2. Assign scorers after exam completion for evaluation
3. Use multiple committee members for important exams
4. Balance scorer workload across multiple people

### Security Considerations
1. Committee members should only access during exam periods
2. Scorers should evaluate results promptly after exam completion
3. Regular review of user roles and assignments
4. Monitor access logs for audit purposes

### Workflow Recommendations
1. **Planning Phase**: Assign committee members to upcoming deliveries
2. **Execution Phase**: Committee members manage delivery start/stop
3. **Evaluation Phase**: Assign and activate scorers for result evaluation
4. **Review Phase**: Monitor assignment effectiveness and adjust as needed

## Troubleshooting

### Common Issues
- **Users can't login**: Verify they have the correct role assigned
- **No deliveries visible**: Check if user is assigned to any deliveries
- **Can't control delivery**: Verify user is assigned as committee member
- **Scoring not available**: Ensure delivery is completed and user is assigned as scorer

### Support
For technical issues or questions about the committee/scorer system, contact your system administrator or check the application logs for detailed error information.