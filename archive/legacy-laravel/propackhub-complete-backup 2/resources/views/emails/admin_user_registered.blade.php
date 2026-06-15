<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to ProPackHub!</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 30px auto;
            background-color: #ffffff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
            text-align: center;
        }
        .header {
            background-color: #1363a6;
            color: #ffffff;
            padding: 15px;
            font-size: 24px;
            font-weight: bold;
            border-top-left-radius: 8px;
            border-top-right-radius: 8px;
        }
        .content {
            padding: 20px;
            color: #333333;
            font-size: 16px;
            text-align: left;
        }
        .details {
            background-color: #f9f9f9;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
            text-align: left;
        }
        .details ul {
            list-style: none;
            padding: 0;
        }
        .details li {
            padding: 8px 0;
            font-size: 16px;
            color: #333333;
        }
        .button {
            display: inline-block;
            padding: 12px 20px;
            font-size: 16px;
            color: #ffffff !important;
            background-color: #1363a6;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin-top: 20px;
        }
        .footer {
            margin-top: 20px;
            font-size: 14px;
            color: #666666;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">New User Registration</div>
        <div class="content">
            <p>A new user has registered on your platform. Below are the details:</p>
            
            <div class="details">
                <p><strong>User Account Details:</strong></p>
                <ul>
                    <li><strong>Name:</strong> {{ $user->name }}</li>
                    <li><strong>Email:</strong> {{ $user->email }}</li>
                    <li><strong>Company Name:</strong> {{ $user->company_name }}</li>
                    <li><strong>Job Title:</strong> {{ $user->full_job_title }}</li>
                    <li><strong>Company Type:</strong> {{ $user->company_type }}</li>
                    <li><strong>Country:</strong> {{ $user->country }}</li>
                </ul>
            </div>
            
            <a href="{{ url('/') }}" class="button">Check Dashboard for Approval</a>
        </div>
    </div>
</body>
</html>
