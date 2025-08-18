<?php
// Gebruik 'use' om de PHPMailer classes te importeren
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Zorg ervoor dat PHPMailer is geladen. Als je Composer gebruikt, is dit beter.
// require 'vendor/autoload.php'; 
// Voor dit voorbeeld gebruiken we de directe include.
include('./smtp/PHPMailerAutoload.php');

/**
 * Functie om een e-mail te versturen via SMTP.
 *
 * BELANGRIJK: Het direct opslaan van inloggegevens in de code is een groot veiligheidsrisico.
 * In een productieomgeving is het sterk aanbevolen om 'environment variables' of een
 * beveiligd configuratiebestand te gebruiken.
 *
 * @param string $to Het e-mailadres van de ontvanger.
 * @param string $subject Het onderwerp van de e-mail.
 * @param string $msg De HTML-body van de e-mail.
 * @param string $replyToEmail Het e-mailadres van de klant voor de 'Reply-To' header.
 * @param string $replyToName De naam van de klant voor de 'Reply-To' header.
 * @return string 'Sent' bij succes, of een foutmelding bij falen.
 */
function smtp_mailer($to, $subject, $msg, $replyToEmail, $replyToName){
    $mail = new PHPMailer(true); // 'true' zet exceptions aan
    try {
        //Server-instellingen
        // $mail->SMTPDebug = 2; // Aanzetten voor uitgebreide debug output
        $mail->isSMTP();
        $mail->Host       = 'smtp.gmail.com'; // Stel de SMTP server in
        $mail->SMTPAuth   = true;
        $mail->Username   = 'fhfildeo@proton.me'; // JOUW GMAIL ADRES
        $mail->Password   = 'cqwpkgwffghvqnbd'; // JOUW GMAIL APP-WACHTWOORD
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = 587;

        // Ontvangers
        $mail->setFrom('fhfildeo@proton.me', 'Reparo.nl Reparatieaanvragen');
        $mail->addAddress($to); // Voeg de ontvanger toe (info@reparo.nl)
        $mail->addReplyTo($replyToEmail, $replyToName); // Zodat je direct de klant kunt beantwoorden

        // Inhoud
        $mail->isHTML(true);
        $mail->CharSet = 'UTF-8';
        $mail->Subject = $subject;
        $mail->Body    = $msg;
        $mail->AltBody = strip_tags($msg); // Alternatieve body voor non-HTML mail clients

        $mail->send();
        return 'Sent';
    } catch (Exception $e) {
        // Geef de foutmelding terug voor logging
        return "Message could not be sent. Mailer Error: {$mail->ErrorInfo}";
    }
}

// Controleer of het een POST request is
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Haal de data op en sanitize deze
    $name = htmlspecialchars(trim($_POST['name']));
    $email = htmlspecialchars(trim($_POST['email']));
    $device = htmlspecialchars(trim($_POST['device']));
    $issue = htmlspecialchars(trim($_POST['issue']));

    // Simpele validatie
    if (empty($name) || !filter_var($email, FILTER_VALIDATE_EMAIL) || empty($device) || empty($issue)) {
        http_response_code(400); // Bad Request
        echo json_encode(['status' => 'error', 'message' => 'Vul alstublieft alle velden correct in.']);
        exit();
    }

    $to = "fhfildeo@proton.me"; // Hier komt de e-mail binnen
    $subject = "Nieuwe reparatieaanvraag van " . $name;

    // Maak een nette HTML-body voor de e-mail
    $body = "
        <html>
        <body style='font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6;'>
            <h2 style='color: #003057;'>Nieuwe Reparatieaanvraag via Reparo.nl</h2>
            <p><strong>Naam:</strong> {$name}</p>
            <p><strong>E-mailadres:</strong> <a href='mailto:{$email}'>{$email}</a></p>
            <p><strong>Toestel & Model:</strong> {$device}</p>
            <p><strong>Omschrijving van het probleem:</strong></p>
            <p style='padding: 10px; border: 1px solid #ddd; border-radius: 5px; background-color: #f9f9f9;'>
                " . nl2br($issue) . "
            </p>
        </body>
        </html>
    ";

    // Verstuur de e-mail
    $result = smtp_mailer($to, $subject, $body, $email, $name);

    // Stuur een JSON-response terug naar de website
    header('Content-Type: application/json');
    if ($result === 'Sent') {
        echo json_encode(['status' => 'success', 'message' => 'Bedankt voor je aanvraag! We nemen zo snel mogelijk contact met je op.']);
    } else {
        error_log($result); // Log de fout op de server
        http_response_code(500); // Internal Server Error
        echo json_encode(['status' => 'error', 'message' => 'Er is iets fout gegaan bij het versturen. Probeer het later opnieuw.']);
    }
    exit();
}
?>