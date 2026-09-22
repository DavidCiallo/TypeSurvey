package main

import (
	"bytes"
	"encoding/json"
	"net/http"
)

// Resend-backed transactional email (verification links), same as
// server/modules/email/email.service.ts.

const resendAPIURL = "https://api.resend.com/emails"

func sendEmail(from, to, subject, html string) bool {
	apiKey := getSetting("resend_api_key")
	if apiKey == "" {
		return false
	}
	payload, _ := json.Marshal(map[string]string{
		"from": from, "to": to, "subject": subject, "html": html,
	})
	req, err := http.NewRequest("POST", resendAPIURL, bytes.NewReader(payload))
	if err != nil {
		return false
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode >= 200 && resp.StatusCode < 300
}

func buildVerificationEmail(verifyUrl string) (subject, html string) {
	subject = "Verify your email address"
	html = `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
            <h2 style="color: #1a1a1a; margin-bottom: 16px;">Verify Your Email</h2>
            <p style="color: #555; line-height: 1.6; margin-bottom: 24px;">
                Thank you for registering. Please click the button below to verify your email address.
            </p>
            <a href="` + verifyUrl + `"
               style="display: inline-block; background-color: #0066FF; color: #fff; text-decoration: none;
                      padding: 12px 32px; border-radius: 8px; font-weight: 600;">
                Verify Email
            </a>
            <p style="color: #999; font-size: 13px; margin-top: 32px;">
                If you did not create an account, you can safely ignore this email.
                This link expires in 3 days.
            </p>
        </div>
    `
	return subject, html
}
