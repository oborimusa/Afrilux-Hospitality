from flask import Flask, request, jsonify
from flask_cors import CORS
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

app = Flask(__name__)
CORS(app)

# ========== EMAIL CONFIGURATION ==========
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
EMAIL_ADDRESS = "acquire@jobpitality.com"  # CHANGE TO YOUR EMAIL
EMAIL_PASSWORD = "YOUR_APP_PASSWORD"  # CHANGE TO YOUR APP PASSWORD

def send_job_application_email(application_data):
    try:
        msg = MIMEMultipart()
        msg['From'] = EMAIL_ADDRESS
        msg['To'] = "acquire@jobpitality.com"
        msg['Subject'] = f"New Job Application: {application_data['job_title']} at {application_data['company']}"
        
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif;">
            <h2 style="color: #ff9e00;">New Job Application Received</h2>
            <h3>Candidate Details:</h3>
            <table style="border-collapse: collapse; width: 100%;">
                <tr><td><strong>Name:</strong></td><td>{application_data['from_name']}</td></tr>
                <tr><td><strong>Email:</strong></td><td>{application_data['from_email']}</td></tr>
                <tr><td><strong>Phone:</strong></td><td>{application_data['phone']}</td></tr>
                <tr><td><strong>Qualification:</strong></td><td>{application_data['qualification']}</td></tr>
                <tr><td><strong>Experience:</strong></td><td>{application_data['experience']}</td></tr>
            </table>
            <h3>Job Details:</h3>
            <table>
                <tr><td><strong>Position:</strong></td><td>{application_data['job_title']}</td></tr>
                <tr><td><strong>Company:</strong></td><td>{application_data['company']}</td></tr>
            </table>
            <h3>Message:</h3>
            <p>{application_data['message']}</p>
            <hr>
            <p>Submitted via Jobpitality on {application_data.get('date', 'N/A')}</p>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(body, 'html'))
        
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
            server.send_message(msg)
        
        send_confirmation_email(application_data)
        return True, "Email sent successfully"
        
    except Exception as e:
        return False, str(e)

def send_confirmation_email(application_data):
    try:
        msg = MIMEMultipart()
        msg['From'] = EMAIL_ADDRESS
        msg['To'] = application_data['from_email']
        msg['Subject'] = f"Application Received - {application_data['job_title']}"
        
        body = f"""
        <html>
        <body>
            <h2>Application Received!</h2>
            <p>Dear {application_data['from_name']},</p>
            <p>Thank you for applying for <strong>{application_data['job_title']}</strong> at <strong>{application_data['company']}</strong>.</p>
            <p>We will review your application and contact you within 2-3 business days.</p>
            <p>Best regards,<br>Jobpitality Team</p>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(body, 'html'))
        
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
            server.send_message(msg)
            
    except Exception as e:
        print(f"Error sending confirmation: {e}")

@app.route('/api/submit-application', methods=['POST'])
def submit_application():
    try:
        data = request.json
        data['date'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        success, message = send_job_application_email(data)
        
        if success:
            return jsonify({'success': True, 'message': 'Application submitted successfully!'}), 200
        else:
            return jsonify({'success': False, 'error': message}), 500
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'OK', 'message': 'Email server is running'}), 200

if __name__ == '__main__':
    print("=" * 50)
    print("📧 Jobpitality Email Server")
    print("=" * 50)
    print("Server running on http://localhost:5000")
    print("=" * 50)
    app.run(host='0.0.0.0', port=5000, debug=True)
EOF