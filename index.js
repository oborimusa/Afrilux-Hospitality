const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const cors = require('cors')({ origin: true });

admin.initializeApp();

// ============================================================
// 1. EMAIL CONFIGURATION
// ============================================================
// These will be set via Firebase CLI: firebase functions:config:set
const EMAIL_USER = functions.config().email.user || process.env.EMAIL_USER;
const EMAIL_PASSWORD = functions.config().email.password || process.env.EMAIL_PASSWORD;
const ADMIN_EMAIL = functions.config().email.admin || process.env.ADMIN_EMAIL;

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASSWORD,
  },
});

// ============================================================
// 2. SEND EMAIL HELPER
// ============================================================
async function sendEmail(to, subject, html) {
  const mailOptions = {
    from: `"HospitalityRecruit" <${EMAIL_USER}>`,
    to: to,
    subject: subject,
    html: html,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent to ${to}`);
  } catch (error) {
    console.error('❌ Error sending email:', error);
  }
}

// ============================================================
// 3. EMPLOYER REGISTRATION CONFIRMATION
// ============================================================
exports.onEmployerRegistered = functions.firestore
  .document('employers/{employerId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    const email = data.contactEmail;
    const companyName = data.companyName;
    const plan = data.plan || 'Standard';

    const subject = 'Welcome to HospitalityRecruit – Registration Received';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px;">
        <h2 style="color: #C9A84C;">Welcome to HospitalityRecruit!</h2>
        <p>Hi ${data.contactName},</p>
        <p>Thank you for registering as an employer with <strong>HospitalityRecruit</strong>.</p>
        <div style="background: #f4f2ee; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <p><strong>Company:</strong> ${companyName}</p>
          <p><strong>Plan:</strong> ${plan.charAt(0).toUpperCase() + plan.slice(1)}</p>
          <p><strong>Status:</strong> <span style="color: #E63946;">Pending Approval</span></p>
        </div>
        <p>Our team will review your registration and get back to you within <strong>24-48 hours</strong>.</p>
        <p>You will receive a confirmation email once your account is approved.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
        <p style="color: #8A8580; font-size: 0.9rem;">
          <i>This is an automated message from HospitalityRecruit.</i>
        </p>
      </div>
    `;

    await sendEmail(email, subject, html);

    // Also notify admin
    const adminSubject = 'New Employer Registration – Pending Approval';
    const adminHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px;">
        <h2 style="color: #C9A84C;">New Employer Registration</h2>
        <p>A new employer has registered on HospitalityRecruit.</p>
        <div style="background: #f4f2ee; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <p><strong>Company:</strong> ${companyName}</p>
          <p><strong>Contact:</strong> ${data.contactName}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${data.contactPhone}</p>
          <p><strong>Plan:</strong> ${plan}</p>
          <p><strong>Industry:</strong> ${data.industry}</p>
        </div>
        <p>
          <a href="https://hospitalityrecruit.netlify.app/admin/dashboard/" 
             style="background: #C9A84C; color: #0A1628; padding: 10px 20px; border-radius: 50px; text-decoration: none; font-weight: 700;">
            Review in Admin Dashboard
          </a>
        </p>
      </div>
    `;

    await sendEmail(ADMIN_EMAIL, adminSubject, adminHtml);
  });

// ============================================================
// 4. EMPLOYER APPROVED
// ============================================================
exports.onEmployerApproved = functions.firestore
  .document('employers/{employerId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Only trigger when status changes to 'approved'
    if (before.status === 'approved' || after.status !== 'approved') return;

    const email = after.contactEmail;
    const companyName = after.companyName;
    const plan = after.plan || 'Standard';

    const subject = '🎉 Your HospitalityRecruit Employer Account is Approved!';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px;">
        <h2 style="color: #C9A84C;">Congratulations!</h2>
        <p>Hi ${after.contactName},</p>
        <p>Your employer account for <strong>${companyName}</strong> has been <strong style="color: #2A9D8F;">approved</strong>!</p>
        <div style="background: #f4f2ee; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <p><strong>Plan:</strong> ${plan.charAt(0).toUpperCase() + plan.slice(1)}</p>
          <p><strong>Status:</strong> <span style="color: #2A9D8F;">✅ Active</span></p>
        </div>
        <p>You can now:</p>
        <ul style="padding-left: 20px;">
          <li>✅ Post job openings</li>
          <li>✅ Manage your listings</li>
          <li>✅ Access the employer dashboard</li>
        </ul>
        <p style="margin: 20px 0;">
          <a href="https://hospitalityrecruit.netlify.app/employers/dashboard/" 
             style="background: #C9A84C; color: #0A1628; padding: 12px 25px; border-radius: 50px; text-decoration: none; font-weight: 700;">
            Go to Dashboard
          </a>
        </p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
        <p style="color: #8A8580; font-size: 0.9rem;">
          <i>Need help? <a href="https://hospitalityrecruit.netlify.app/contact/" style="color: #C9A84C;">Contact support</a></i>
        </p>
      </div>
    `;

    await sendEmail(email, subject, html);
  });

// ============================================================
// 5. EMPLOYER REJECTED
// ============================================================
exports.onEmployerRejected = functions.firestore
  .document('employers/{employerId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    if (before.status === 'rejected' || after.status !== 'rejected') return;

    const email = after.contactEmail;
    const companyName = after.companyName;

    const subject = 'HospitalityRecruit Employer Account – Update';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px;">
        <h2 style="color: #E63946;">Account Not Approved</h2>
        <p>Hi ${after.contactName},</p>
        <p>Unfortunately, your employer registration for <strong>${companyName}</strong> was not approved at this time.</p>
        <p>This could be due to:</p>
        <ul style="padding-left: 20px;">
          <li>Incomplete or incorrect information</li>
          <li>Verification issues</li>
          <li>Plan selection not meeting requirements</li>
        </ul>
        <p>If you believe this is an error, please contact our support team.</p>
        <p style="margin: 20px 0;">
          <a href="https://hospitalityrecruit.netlify.app/contact/" 
             style="background: #C9A84C; color: #0A1628; padding: 12px 25px; border-radius: 50px; text-decoration: none; font-weight: 700;">
            Contact Support
          </a>
        </p>
      </div>
    `;

    await sendEmail(email, subject, html);
  });

// ============================================================
// 6. JOB POSTED (Admin Notification)
// ============================================================
exports.onJobPosted = functions.firestore
  .document('jobs/{jobId}')
  .onCreate(async (snap, context) => {
    const job = snap.data();

    const subject = '📋 New Job Posted – Pending Approval';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px;">
        <h2 style="color: #C9A84C;">New Job Posted</h2>
        <p>A new job has been posted on HospitalityRecruit.</p>
        <div style="background: #f4f2ee; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <p><strong>Title:</strong> ${job.jobTitle || 'Untitled'}</p>
          <p><strong>Company:</strong> ${job.companyName || 'N/A'}</p>
          <p><strong>Location:</strong> ${job.jobLocation || 'N/A'}</p>
          <p><strong>Type:</strong> ${job.jobType || 'N/A'}</p>
          <p><strong>Salary:</strong> ${job.jobSalary || 'N/A'}</p>
          <p><strong>Category:</strong> ${job.jobCategory || 'N/A'}</p>
          <p><strong>Plan:</strong> ${job.plan || 'Standard'}</p>
        </div>
        <p>
          <a href="https://hospitalityrecruit.netlify.app/admin/dashboard/" 
             style="background: #C9A84C; color: #0A1628; padding: 10px 20px; border-radius: 50px; text-decoration: none; font-weight: 700;">
            Review in Admin Dashboard
          </a>
        </p>
      </div>
    `;

    await sendEmail(ADMIN_EMAIL, subject, html);
  });

// ============================================================
// 7. JOB APPROVED (Employer Notification)
// ============================================================
exports.onJobApproved = functions.firestore
  .document('jobs/{jobId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    if (before.status === 'approved' || after.status !== 'approved') return;

    // Get employer email
    try {
      const employerDoc = await admin.firestore()
        .collection('employers')
        .doc(after.employerId)
        .get();

      if (!employerDoc.exists) return;
      const employer = employerDoc.data();
      const email = employer.contactEmail || after.companyEmail;

      if (!email) return;

      const subject = '✅ Your Job Posting is Now Live!';
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px;">
          <h2 style="color: #2A9D8F;">Job Approved!</h2>
          <p>Hi ${employer.contactName || 'Employer'},</p>
          <p>Your job posting for <strong>"${after.jobTitle || 'Untitled'}"</strong> has been <strong style="color: #2A9D8F;">approved</strong> and is now live on HospitalityRecruit!</p>
          <div style="background: #f4f2ee; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p><strong>Title:</strong> ${after.jobTitle || 'Untitled'}</p>
            <p><strong>Company:</strong> ${after.companyName || 'N/A'}</p>
            <p><strong>Location:</strong> ${after.jobLocation || 'N/A'}</p>
            <p><strong>Status:</strong> <span style="color: #2A9D8F;">✅ Live</span></p>
          </div>
          <p style="margin: 20px 0;">
            <a href="https://hospitalityrecruit.netlify.app/candidates/job-board/" 
               style="background: #C9A84C; color: #0A1628; padding: 12px 25px; border-radius: 50px; text-decoration: none; font-weight: 700;">
              View Job Board
            </a>
          </p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
          <p style="color: #8A8580; font-size: 0.9rem;">
            <i>Need to make changes? <a href="https://hospitalityrecruit.netlify.app/employers/dashboard/" style="color: #C9A84C;">Go to Dashboard</a></i>
          </p>
        </div>
      `;

      await sendEmail(email, subject, html);
    } catch (error) {
      console.error('❌ Error sending job approval email:', error);
    }
  });

// ============================================================
// 8. JOB REJECTED (Employer Notification)
// ============================================================
exports.onJobRejected = functions.firestore
  .document('jobs/{jobId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    if (before.status === 'rejected' || after.status !== 'rejected') return;

    try {
      const employerDoc = await admin.firestore()
        .collection('employers')
        .doc(after.employerId)
        .get();

      if (!employerDoc.exists) return;
      const employer = employerDoc.data();
      const email = employer.contactEmail || after.companyEmail;

      if (!email) return;

      const subject = 'Job Posting Update – Not Approved';
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px;">
          <h2 style="color: #E63946;">Job Not Approved</h2>
          <p>Hi ${employer.contactName || 'Employer'},</p>
          <p>Your job posting for <strong>"${after.jobTitle || 'Untitled'}"</strong> was not approved.</p>
          <p>Common reasons for rejection:</p>
          <ul style="padding-left: 20px;">
            <li>Missing or incomplete information</li>
            <li>Inaccurate salary or location details</li>
            <li>Duplicate posting</li>
            <li>Content doesn't meet our guidelines</li>
          </ul>
          <p style="margin: 20px 0;">
            <a href="https://hospitalityrecruit.netlify.app/employers/dashboard/" 
               style="background: #C9A84C; color: #0A1628; padding: 12px 25px; border-radius: 50px; text-decoration: none; font-weight: 700;">
              Edit and Resubmit
            </a>
          </p>
        </div>
      `;

      await sendEmail(email, subject, html);
    } catch (error) {
      console.error('❌ Error sending job rejection email:', error);
    }
  });