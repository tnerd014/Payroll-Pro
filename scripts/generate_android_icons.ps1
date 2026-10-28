Add-Type -AssemblyName System.Drawing

$sourcePath = "c:\Users\USER\Desktop\Payroll Pro\public\icon.png"
if (-not (Test-Path $sourcePath)) {
    Write-Error "Source icon not found at $sourcePath"
    exit 1
}

$sourceBmp = [System.Drawing.Bitmap]::new($sourcePath)
$resDir = "c:\Users\USER\Desktop\Payroll Pro\android\app\src\main\res"

# Densities and sizes
$densities = @(
    @{ Name = "mipmap-mdpi";    Launcher = 48;  Foreground = 108 },
    @{ Name = "mipmap-hdpi";    Launcher = 72;  Foreground = 162 },
    @{ Name = "mipmap-xhdpi";   Launcher = 96;  Foreground = 216 },
    @{ Name = "mipmap-xxhdpi";  Launcher = 144; Foreground = 324 },
    @{ Name = "mipmap-xxxhdpi"; Launcher = 192; Foreground = 432 }
)

function Draw-HighQuality($src, $targetW, $targetH, $destPath, $mode) {
    $bmp = [System.Drawing.Bitmap]::new($targetW, $targetH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    if ($mode -eq "round") {
        # White circular background
        $brush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
        $g.FillEllipse($brush, 0, 0, $targetW, $targetH)
        $brush.Dispose()
        # Scale icon inside circle (with 10% padding)
        $pad = [int]($targetW * 0.08)
        $g.DrawImage($src, $pad, $pad, $targetW - (2 * $pad), $targetH - (2 * $pad))
    }
    elseif ($mode -eq "square") {
        # White rounded rectangle background
        $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
        $radius = [int]($targetW * 0.20)
        $dia = $radius * 2
        $rect = [System.Drawing.Rectangle]::new(0, 0, $targetW, $targetH)
        $path.AddArc(0, 0, $dia, $dia, 180, 90)
        $path.AddArc($targetW - $dia, 0, $dia, $dia, 270, 90)
        $path.AddArc($targetW - $dia, $targetH - $dia, $dia, $dia, 0, 90)
        $path.AddArc(0, $targetH - $dia, $dia, $dia, 90, 90)
        $path.CloseFigure()
        
        $brush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
        $g.FillPath($brush, $path)
        $brush.Dispose()
        $path.Dispose()

        # Scale icon inside with 8% padding
        $pad = [int]($targetW * 0.08)
        $g.DrawImage($src, $pad, $pad, $targetW - (2 * $pad), $targetH - (2 * $pad))
    }
    elseif ($mode -eq "foreground") {
        # Transparent background, source icon drawn directly
        $g.Clear([System.Drawing.Color]::Transparent)
        $g.DrawImage($src, 0, 0, $targetW, $targetH)
    }

    $g.Dispose()
    $bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

foreach ($d in $densities) {
    $folder = Join-Path $resDir $d.Name
    if (-not (Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder -Force | Out-Null
    }

    # 1. ic_launcher.png (square with rounded corners)
    $launcherPath = Join-Path $folder "ic_launcher.png"
    Draw-HighQuality -src $sourceBmp -targetW $d.Launcher -targetH $d.Launcher -destPath $launcherPath -mode "square"

    # 2. ic_launcher_round.png (circle)
    $roundPath = Join-Path $folder "ic_launcher_round.png"
    Draw-HighQuality -src $sourceBmp -targetW $d.Launcher -targetH $d.Launcher -destPath $roundPath -mode "round"

    # 3. ic_launcher_foreground.png (for adaptive icon)
    $fgPath = Join-Path $folder "ic_launcher_foreground.png"
    Draw-HighQuality -src $sourceBmp -targetW $d.Foreground -targetH $d.Foreground -destPath $fgPath -mode "foreground"

    Write-Host "Generated icons for $($d.Name): $($d.Launcher)x$($d.Launcher) & $($d.Foreground)x$($d.Foreground)"
}

$sourceBmp.Dispose()
Write-Host "All Android icons generated successfully!"
