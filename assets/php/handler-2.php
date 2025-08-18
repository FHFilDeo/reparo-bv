<?php
// Gebruik de PHPMailer classes
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Laad de PHPMailer bibliotheek
require './smtp/PHPMailerAutoload.php';
require '/PHPMailer/src/Exception.php';
require 'path/to/PHPMailer/src/PHPMailer.php';
require 'path/to/PHPMailer/src/SMTP.php';

// Functie om de e-mail te versturen
function smtp_mailer($to, $subject, $msg, $replyToEmail, $replyToName){
    $mail = new PHPMailer(true); // 'true' zet exceptions aan
    try {
        // --- Server-instellingen ---
        // $mail->SMTPDebug = 2; // Haal commentaar weg voor gedetailleerde debug output in de server logs
        $mail->isSMTP();
        $mail->Host       = 'smtp.gmail.com';
        $mail->SMTPAuth   = true;
        $mail->Username   = 'fhfildeo@proton.me'; // VUL HIER JE VOLLEDIGE GMAIL ADRES IN
        $mail->Password   = 'cqwpkgwffghvqnbd';  // VUL HIER JE GMAIL APP-WACHTWOORD IN (16 tekens)
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = 587;

        // --- Ontvangers ---
        $mail->setFrom('fhfildeo@proton.me', 'Reparo Website Formulier'); // 'Van' adres
        $mail->addAddress($to); // 'Aan' adres (info@reparo.nl)
        $mail->addReplyTo($replyToEmail, $replyToName); // Zodat je direct de klant kunt beantwoorden

        // --- Inhoud ---
        $mail->isHTML(true);
        $mail->CharSet = 'UTF-8';
        $mail->Subject = $subject;
        $mail->Body    = $msg;
        $mail->AltBody = strip_tags($msg); // Voor e-mailclients die geen HTML ondersteunen

        $mail->send();
        return 'Sent';
    } catch (Exception $e) {
        // Geef een gedetailleerde foutmelding terug als het misgaat
        return "De e-mail kon niet worden verstuurd. Fout: {$mail->ErrorInfo}";
    }
}

// Controleer of het formulier is verstuurd
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Haal de data op en maak deze veilig
    $name = htmlspecialchars(trim($_POST['name']));
    $email = htmlspecialchars(trim($_POST['email']));
    $device = htmlspecialchars(trim($_POST['device']));
    $issue = htmlspecialchars(trim($_POST['issue']));

    // Server-side validatie
    if (empty($name) || !filter_var($email, FILTER_VALIDATE_EMAIL) || empty($device) || empty($issue)) {
        http_response_code(400); // Bad Request
        echo json_encode(['status' => 'error', 'message' => 'Vul alstublieft alle velden correct in.']);
        exit();
    }

    // Stel de e-mailgegevens samen
    $to = "fhfildeo@proton.me";
    $subject = "Nieuwe reparatieaanvraag van " . $name;
    $body = "
        <html>
        <body style='font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6;'>
            <h2 style='color: #3b82f6;'>Nieuwe Reparatieaanvraag via Reparo.nl</h2>
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
        http_response_code(500); // Internal Server Error
        echo json_encode(['status' => 'error', 'message' => $result]); // Stuur de specifieke foutmelding terug
    }
    exit();
}
?>
