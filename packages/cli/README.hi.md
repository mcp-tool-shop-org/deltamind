<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.md">English</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/deltamind/readme.png" width="400" alt="DeltaMind" />
</p>

<p align="center">
  <strong>Operator CLI for DeltaMind</strong><br>
  Inspect &bull; Export &bull; Replay &bull; Debug
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@deltamind/cli"><img src="https://img.shields.io/npm/v/@deltamind/cli" alt="npm" /></a>
  <a href="https://github.com/mcp-tool-shop-org/deltamind/blob/main/LICENSE"><img src="https://img.shields.io/github/license/mcp-tool-shop-org/deltamind" alt="license" /></a>
</p>

---

## यह क्या है?

`@deltamind/cli` [DeltaMind](https://www.npmjs.com/package/@deltamind/core) के लिए कमांड-लाइन इंटरफ़ेस है— 8 कमांड जो आपको टर्मिनल से एजेंट मेमोरी सत्रों की जांच, डिबग और निर्यात करने की अनुमति देते हैं।

## इंस्टॉल करें

```bash
npm install -g @deltamind/cli
```

## कमांड

| कमांड | विवरण |
|---------|-------------|
| `deltamind inspect` | सक्रिय स्थिति दिखाएं (सभी आइटम या `--kind goal`) |
| `deltamind export` | संदर्भ ब्लॉक निर्यात करें (`--max-chars 4000`, `--for ai-loadout`) |
| `deltamind changed --since <ref>` | दिखाएं कि किसी टाइमस्टैम्प, सीक्वेंस या टर्न आईडी के बाद क्या बदला है |
| `deltamind explain <id>` | एक आइटम का पूरा इतिहास—फ़ील्ड, बदलाव, उत्पत्ति |
| `deltamind replay` | उत्पत्ति लॉग को देखें (`--since`, `--type accepted`) |
| `deltamind suggest-memory` | मेमोरी फ़ाइल अपडेट का सुझाव दें (`--min-confidence 0.8`) |
| `deltamind save` | सत्र को `.deltamind/` में सहेजें (`--from-stdin` पाइप किए गए स्नैपशॉट के लिए) |
| `deltamind resume` | सत्र लोड करें और आंकड़े दिखाएं |

सभी कमांड `--json` का समर्थन करते हैं, जो मशीन-पठनीय आउटपुट प्रदान करता है।

## डिज़ाइन

- **पाइप-अनुकूल:** stdout डेटा है, stderr निदान है, कोई ANSI कोड नहीं।
- **एग्जिट कोड:** 0 सफलता, 1 उपयोग त्रुटि, 2 `.deltamind/` निर्देशिका नहीं है।
- **शून्य कॉन्फ़िगरेशन:** `.deltamind/` को वर्तमान कार्यशील निर्देशिका (cwd) से खोजा जाता है (जैसे `.git/`)।
- **कोई फ्रेमवर्क नहीं:** Node 18+ `parseArgs`, `@deltamind/core` के अलावा कोई रनटाइम निर्भरता नहीं।

## उदाहरण

```bash
# What changed in the last hour?
deltamind changed --since 2025-01-15T10:00:00Z

# Export context for an LLM prompt
deltamind export --max-chars 4000

# Debug a specific item
deltamind explain goal::build-rest-api

# Pipe session state from another tool
cat snapshot.json | deltamind save --from-stdin
```

## लिंक

- [GitHub](https://github.com/mcp-tool-shop-org/deltamind)
- [Handbook](https://mcp-tool-shop-org.github.io/deltamind/handbook/)
- [Core package](https://www.npmjs.com/package/@deltamind/core)

## लाइसेंस

MIT
