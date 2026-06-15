<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Feedback Received - ProPackHub</title>
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
        .feedback-box {
            background-color: #f4f4f4;
            padding: 15px;
            border-left: 5px solid #1363a6;
            margin-top: 10px;
            font-style: italic;
            color: #555;
            border-radius: 5px;
        }
        .footer {
            margin-top: 20px;
            font-size: 14px;
            color: #666666;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">New Feedback Received</div>
        <div class="content">
            <p><strong>User:</strong> {{ $feedback->user->name }} ({{ $feedback->user->email }})</p>
            <p><strong>Message:</strong></p>
            <div class="feedback-box">
                "{{ $feedback->feedback }}"
            </div>
        </div>
        <div class="footer">
            Regards, <br>
            <strong>ProPackHub Team</strong>
        </div>
    </div>
</body>
</html>
