Param(
  [string]$OutputDir = "public\logos",
  [string]$Proxy = ""
)
$ErrorActionPreference = "Stop"
if (-not (Test-Path $OutputDir)) { New-Item -ItemType Directory -Path $OutputDir | Out-Null }
$sources = @(
  @{name="chatgpt"; urls=@(
    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/OpenAI_Logo.svg/512px-OpenAI_Logo.svg.png",
    "https://logo.clearbit.com/openai.com"
  )},
  @{name="claude"; urls=@(
    "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Anthropic_AI_logo.svg/512px-Anthropic_AI_logo.svg.png",
    "https://logo.clearbit.com/claude.ai"
  )},
  @{name="gemini"; urls=@(
    "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Google_Gemini_logo.svg/512px-Google_Gemini_logo.svg.png",
    "https://logo.clearbit.com/google.com"
  )},
  @{name="notion-ai"; urls=@(
    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Notion_logo.svg/512px-Notion_logo.svg.png",
    "https://logo.clearbit.com/notion.so"
  )},
  @{name="perplexity"; urls=@(
    "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Perplexity_AI_logo.svg/512px-Perplexity_AI_logo.svg.png",
    "https://logo.clearbit.com/perplexity.ai"
  )},
  @{name="miro-ai"; urls=@(
    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Miro_logo.svg/512px-Miro_logo.svg.png",
    "https://logo.clearbit.com/miro.com"
  )},
  @{name="confluence-ai"; urls=@(
    "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Atlassian-logo.svg/512px-Atlassian-logo.svg.png",
    "https://logo.clearbit.com/atlassian.com"
  )},
  @{name="jira-ai"; urls=@(
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Atlassian_Jira_logo.svg/512px-Atlassian_Jira_logo.svg.png",
    "https://logo.clearbit.com/atlassian.com"
  )},
  @{name="inworld-studio"; urls=@(
    "https://logo.clearbit.com/inworld.ai"
  )},
  @{name="midjourney"; urls=@(
    "https://logo.clearbit.com/midjourney.com"
  )},
  @{name="stable-diffusion"; urls=@(
    "https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Stability_AI_logo.svg/512px-Stability_AI_logo.svg.png",
    "https://logo.clearbit.com/stability.ai"
  )},
  @{name="adobe-firefly"; urls=@(
    "https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Adobe_Corporate_logo.svg/512px-Adobe_Corporate_logo.svg.png",
    "https://logo.clearbit.com/adobe.com"
  )},
  @{name="leonardo-ai"; urls=@(
    "https://logo.clearbit.com/leonardo.ai"
  )},
  @{name="playground-ai"; urls=@(
    "https://logo.clearbit.com/playgroundai.com"
  )},
  @{name="meshy"; urls=@(
    "https://logo.clearbit.com/meshy.ai"
  )},
  @{name="kaedim"; urls=@(
    "https://logo.clearbit.com/kaedim.com"
  )},
  @{name="luma-ai"; urls=@(
    "https://logo.clearbit.com/lumalabs.ai"
  )},
  @{name="adobe-substance-3d"; urls=@(
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Adobe_Substance_3D_Logo.svg/512px-Adobe_Substance_3D_Logo.svg.png",
    "https://logo.clearbit.com/adobe.com"
  )},
  @{name="polycam"; urls=@(
    "https://logo.clearbit.com/poly.cam"
  )},
  @{name="deepmotion"; urls=@(
    "https://logo.clearbit.com/deepmotion.com"
  )},
  @{name="rokoko-vision"; urls=@(
    "https://logo.clearbit.com/rokoko.com"
  )},
  @{name="plask"; urls=@(
    "https://logo.clearbit.com/plask.ai"
  )},
  @{name="move-ai"; urls=@(
    "https://logo.clearbit.com/move.ai"
  )},
  @{name="radical"; urls=@(
    "https://logo.clearbit.com/radicalmotion.com"
  )},
  @{name="github-copilot"; urls=@(
    "https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Octicons-mark-github.svg/512px-Octicons-mark-github.svg.png",
    "https://logo.clearbit.com/github.com"
  )},
  @{name="cursor"; urls=@(
    "https://logo.clearbit.com/cursor.com"
  )},
  @{name="jetbrains-ai-assistant"; urls=@(
    "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/JetBrains_Logo_2016.svg/512px-JetBrains_Logo_2016.svg.png",
    "https://logo.clearbit.com/jetbrains.com"
  )},
  @{name="amazon-codewhisperer"; urls=@(
    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/AWS_logo_%282%29.svg/512px-AWS_logo_%282%29.svg.png",
    "https://logo.clearbit.com/amazon.com"
  )},
  @{name="tabnine"; urls=@(
    "https://logo.clearbit.com/tabnine.com"
  )},
  @{name="elevenlabs"; urls=@(
    "https://logo.clearbit.com/elevenlabs.io"
  )},
  @{name="playht"; urls=@(
    "https://logo.clearbit.com/play.ht"
  )},
  @{name="resemble-ai"; urls=@(
    "https://logo.clearbit.com/resemble.ai"
  )},
  @{name="replica-studios"; urls=@(
    "https://logo.clearbit.com/replicastudios.com"
  )},
  @{name="aiva"; urls=@(
    "https://logo.clearbit.com/aiva.ai"
  )},
  @{name="soundraw"; urls=@(
    "https://logo.clearbit.com/soundraw.io"
  )},
  @{name="suno"; urls=@(
    "https://logo.clearbit.com/suno.com"
  )},
  @{name="modl-ai"; urls=@(
    "https://logo.clearbit.com/modl.ai"
  )},
  @{name="sentry"; urls=@(
    "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Sentry_logo.svg/512px-Sentry_logo.svg.png",
    "https://logo.clearbit.com/sentry.io"
  )},
  @{name="datadog-bits-ai"; urls=@(
    "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Datadog_logo.svg/512px-Datadog_logo.svg.png",
    "https://logo.clearbit.com/datadoghq.com"
  )},
  @{name="new-relic-grok"; urls=@(
    "https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/NewRelic_logo_2019.svg/512px-NewRelic_logo_2019.svg.png",
    "https://logo.clearbit.com/newrelic.com"
  )},
  @{name="elastic-observability"; urls=@(
    "https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Elastic_logo.svg/512px-Elastic_logo.svg.png",
    "https://logo.clearbit.com/elastic.co"
  )},
  @{name="deepl"; urls=@(
    "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/DeepL_logo.svg/512px-DeepL_logo.svg.png",
    "https://logo.clearbit.com/deepl.com"
  )},
  @{name="lokalise-ai"; urls=@(
    "https://logo.clearbit.com/lokalise.com"
  )},
  @{name="phrase-ai"; urls=@(
    "https://logo.clearbit.com/phrase.com"
  )},
  @{name="runway"; urls=@(
    "https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Runway_ML_logo.svg/512px-Runway_ML_logo.svg.png",
    "https://logo.clearbit.com/runwayml.com"
  )},
  @{name="pika"; urls=@(
    "https://logo.clearbit.com/pika.art"
  )},
  @{name="jasper"; urls=@(
    "https://logo.clearbit.com/jasper.ai"
  )},
  @{name="copy-ai"; urls=@(
    "https://logo.clearbit.com/copy.ai"
  )},
  @{name="canva"; urls=@(
    "https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Canva_Logo.svg/512px-Canva_Logo.svg.png",
    "https://logo.clearbit.com/canva.com"
  )}
)
if ($Proxy -and $Proxy.Trim().Length -gt 0) {
  $proxyParam = @{ Proxy = $Proxy }
} else {
  $proxyParam = @{}
}
$downloaded = 0
foreach ($b in $sources) {
  $out = Join-Path $OutputDir ($b.name + ".png")
  $ok = $false
  foreach ($u in $b.urls) {
    try {
      Invoke-WebRequest -Uri $u -OutFile $out -TimeoutSec 30 @proxyParam
      $ok = $true
      break
    } catch {}
  }
  if ($ok) { $downloaded++ } else { Write-Output ("Failed: " + $b.name) }
}
Write-Output ("Downloaded " + $downloaded + " brand logos to " + $OutputDir)
