<?php
// --- DEBUGGING ---
// Zet deze twee regels aan om de exacte PHP-fout te zien.
// VERWIJDER DEZE REGELS WANNEER DE WEBSITE LIVE GAAT!
ini_set('display_errors', 1);
error_reporting(E_ALL);
// --- EINDE DEBUGGING ---

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Zorg ervoor dat het pad naar PHPMailerAutoload klopt.
// Pas 'smtp/PHPMailerAutoload.php' aan indien nodig.
require 'smtp/PHPMailerAutoload.php';

function smtp_mailer($to, $subject, $msg, $replyToEmail, $replyToName){
    $mail = new PHPMailer(true);
    try {
        //Server-instellingen
        // $mail->SMTPDebug = 2; // Uncomment voor zeer gedetailleerde output
        $mail->isSMTP();
        $mail->Host       = 'smtp.gmail.com';
        $mail->SMTPAuth   = true;
        $mail->Username   = 'fhfildeo@proton.me'; // VUL HIER JE GMAIL ADRES IN
        $mail->Password   = 'cqwp kgwf fghv qnbd';  // VUL HIER JE GMAIL APP-WACHTWOORD IN
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = 587;

        // Ontvangers
        $mail->setFrom('fhfildeo@proton.me', 'Reparo.nl Reparatieaanvragen');
        $mail->addAddress($to);
        $mail->addReplyTo($replyToEmail, $replyToName);

        // Inhoud
        $mail->isHTML(true);
        $mail->CharSet = 'UTF-8';
        $mail->Subject = $subject;
        $mail->Body    = $msg;
        $mail->AltBody = strip_tags($msg);

        $mail->send();
        return 'Sent';
    } catch (Exception $e) {
        // Geef een gedetailleerde foutmelding terug
        return "Message could not be sent. Mailer Error: {$mail->ErrorInfo}";
    }
}

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $name = htmlspecialchars(trim($_POST['name']));
    $email = htmlspecialchars(trim($_POST['email']));
    $device = htmlspecialchars(trim($_POST['device']));
    $issue = htmlspecialchars(trim($_POST['issue']));

    if (empty($name) || !filter_var($email, FILTER_VALIDATE_EMAIL) || empty($device) || empty($issue)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Vul alstublieft alle velden correct in.']);
        exit();
    }

    $to = "fhfildeo@proton.me";
    $subject = "Nieuwe reparatieaanvraag van " . $name;

    $body = "
        <html><body>
            <h2>Nieuwe Reparatieaanvraag via Reparo.nl</h2>
            <p><strong>Naam:</strong> {$name}</p>
            <p><strong>E-mailadres:</strong> {$email}</p>
            <p><strong>Toestel & Model:</strong> {$device}</p>
            <p><strong>Omschrijving:</strong><br>" . nl2br($issue) . "</p>
        </body></html>
    ";

    $result = smtp_mailer($to, $subject, $body, $email, $name);

    header('Content-Type: application/json');
    if ($result === 'Sent') {
        echo json_encode(['status' => 'success', 'message' => 'Bedankt voor je aanvraag! We nemen zo snel mogelijk contact met je op.']);
    } else {
        http_response_code(500);
        // Stuur de gedetailleerde foutmelding van PHPMailer terug
        echo json_encode(['status' => 'error', 'message' => $result]);
    }
    exit();
}
?>