$files = @("index.html", "app.js", "seed-db.html", "style.css")
$replacements = [ordered]@{
    "Ã©" = "é"
    "Crǟer" = "Créer"
    "CrǸer" = "Créer"
    "ǟ" = "é"
    "Ǹ" = "é"
    "Ã¨" = "è"
    "Ãª" = "ê"
    "Ã " = "à"
    "Ã¢" = "â"
    "Ã®" = "î"
    "Ã´" = "ô"
    "Ã¹" = "ù"
    "Ã§" = "ç"
    "Å“" = "œ"
    "Ã€" = "À"
    "âœ–" = "✖"
    "âœ ï¸ " = "✏️ "
    "â† " = "← "
    "ðŸ“…" = "📅"
    "ðŸ“¸" = "📸"
    "â€¢" = "•"
    "SÃ©lectionnez" = "Sélectionnez"
    "PrÃ©sent" = "Présent"
    "ExcusÃ©" = "Excusé"
}

foreach ($f in $files) {
    if (Test-Path $f) {
        $text = [IO.File]::ReadAllText((Resolve-Path $f).Path)
        foreach ($key in $replacements.Keys) {
            $text = $text.Replace($key, $replacements[$key])
        }
        $utf8NoBom = New-Object System.Text.UTF8Encoding $False
        [IO.File]::WriteAllText((Resolve-Path $f).Path, $text, $utf8NoBom)
        Write-Host "Processed $f"
    }
}
