<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.md">English</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/deltamind/readme.png" width="400" alt="DeltaMind" />
</p>

<p align="center">
  <strong>Store what changed.</strong>
</p>

<p align="center">
  Active context compaction for AI agents. Typed deltas, structured state, provenance, and working-set budgeting for long-running conversations.
</p>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/deltamind/actions"><img src="https://github.com/mcp-tool-shop-org/deltamind/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
  <a href="https://mcp-tool-shop-org.github.io/deltamind/"><img src="https://img.shields.io/badge/Landing_Page-live-blue" alt="Landing Page"></a>
</p>

## समस्या

चैट के ट्रांसक्रिप्ट खराब मेमोरी होते हैं। वे स्थापित तथ्यों, अस्थायी विचारों, टूल के शोर, बार-बार दिए गए स्पष्टीकरणों और बदले हुए योजनाओं को एक साथ मिलाकर एक जटिल स्थिति बनाते हैं। जैसे-जैसे बातचीत बढ़ती है, एजेंट भूलने लगते हैं - वे शुरुआती बाधाओं को भूल जाते हैं जबकि पुरानी योजनाओं पर टिके रहते हैं।

सारांश अस्पष्ट होते हैं। वे बारीकियों को खत्म कर देते हैं, स्रोत की जानकारी को नष्ट कर देते हैं, और अटकलों को स्थापित सत्य के साथ मिला देते हैं। आप एक सारांश से यह नहीं पूछ सकते कि "हमने X के बारे में क्या तय किया और क्यों?"

## विचार

बातचीत को संग्रहीत न करें। संग्रहीत करें कि बातचीत ने क्या बदला।

डेल्टामाइंड, ट्रांसक्रिप्ट-को-मेमोरी की जगह, स्टेट-को-मेमोरी का उपयोग करता है। इतिहास को सारांशित करने के बजाय, यह "टाइप्ड डेल्टा" उत्पन्न करता है - लिए गए निर्णय, जोड़े गए प्रतिबंध, खोले गए कार्य, प्रस्तुत किए गए परिकल्पनाएं - और उन्हें संरचित, क्वेरी करने योग्य स्थिति में समेटता है।

500 टर्न की बातचीत, 50वें टर्न की तुलना में 500वें टर्न पर अधिक स्पष्ट महसूस होनी चाहिए।

## आर्किटेक्चर

```
Transcript turns → Event gate → Delta extractor → Normalizer → Reconciler → State
                                    ↑ LLM (gemma2:9b)                        ↓
                                    ↑ Rule-based                    ┌────────┴────────┐
                                                                    ↓                 ↓
                                                              exportContext()    save()/load()
                                                                    ↓                 ↓
                                                          ai-loadout adapter    PROVENANCE.jsonl
                                                                    ↓           snapshot.json
                                                          claude-memories       *.md projections
                                                                    ↓
                                                          advisory suggestions
```

**तीन प्रतिनिधित्व, प्रत्येक का एक विशिष्ट कार्य:**

| प्रतिनिधित्व | उद्देश्य | स्वरूप |
|---------------|---------|--------|
| इवेंट लॉग | क्या हुआ | `PROVENANCE.jsonl` (केवल जोड़ने के लिए) |
| स्टेट स्नैपशॉट | वर्तमान सत्य | `snapshot.json` (संस्करणित) |
| मार्कडाउन प्रोजेक्शन | मानव निरीक्षण | `*.md` (उत्पन्न, कभी भी आधिकारिक नहीं) |

## पैकेज

| पैकेज | विवरण |
|---------|-------------|
| `@deltamind/core` | टाइप्ड डेल्टा, स्टेट मॉडल, समेकन, निष्कर्षण, दृढ़ता, एडेप्टर |
| `@deltamind/cli` | ऑपरेटर CLI - सत्रों का निरीक्षण करें, निर्यात करें, पुनः चलाएं, डीबग करें |

## शुरुआत कैसे करें

```typescript
import { createSession } from "@deltamind/core";

const session = createSession({ forceRuleOnly: true });

session.ingestBatch([
  { turnId: "t-1", role: "user", content: "Build a REST API. Use TypeScript." },
  { turnId: "t-2", role: "assistant", content: "I'll set up Express with TypeScript." },
  { turnId: "t-3", role: "user", content: "Actually, switch to Fastify." },
]);

await session.process();

// What's in state?
const stats = session.stats();
// → { totalItems: 5, activeDecisions: 1, openTasks: 1, ... }

// Export budgeted context for injection
const ctx = session.exportContext({ maxChars: 2000 });
// → Structured text: constraints, decisions, goals, tasks, recent changes

// Save and resume later
const snapshot = session.save();
```

## CLI

```bash
deltamind inspect                    # Active state grouped by kind
deltamind changed --since 5          # What changed since seq 5
deltamind explain item-3             # Deep-dive: fields, provenance, revision chain
deltamind export --for ai-loadout    # Session layer for ai-loadout
deltamind replay --type accepted     # Walk provenance log
deltamind suggest-memory             # Advisory claude-memories updates
deltamind save                       # Persist to .deltamind/
deltamind resume                     # Load session, show health summary
```

## डेल्टा प्रकार

डेल्टामाइंड 11 प्रकार के स्टेट परिवर्तनों को ट्रैक करता है:

| डेल्टा | यह क्या कैप्चर करता है |
|-------|-----------------|
| `goal_set` | सत्र का लक्ष्य क्या है |
| `decision_made` | एक निश्चित विकल्प |
| `decision_revised` | एक पूर्व निर्णय में परिवर्तन |
| `constraint_added` | एक नियम या सीमा |
| `constraint_revised` | एक शिथिलन, कसना, या संशोधन |
| `task_opened` | कार्य जो करने हैं |
| `task_closed` | कार्य जो पूरा हो गया है या छोड़ दिया गया है |
| `fact_learned` | ज्ञान का एक स्थिर टुकड़ा |
| `hypothesis_introduced` | एक अस्थायी विचार (कोई निर्णय नहीं) |
| `branch_created` | अनसुलझे विकल्प |
| `item_superseded` | कुछ जो किसी नए चीज़ से बदल दिया गया है |

## निष्कर्षण

डिजाइन द्वारा हाइब्रिड। दो निष्कर्षणकर्ता, जिनमें पूरक क्षमताएं हैं:

- **नियम-आधारित**: तेज़, सटीक, शून्य लागत। स्पष्ट पैटर्न को पकड़ता है ("हमने तय किया", "नहीं करना चाहिए", "कार्य: ...")। 100% सटीकता, कम रिकॉल।
- **LLM-समर्थित** (gemma2:9b via Ollama): उन अर्थ संबंधी वस्तुओं (लक्ष्यों, उच्च-स्तरीय निर्णयों) को पकड़ता है जिन्हें रेगुलर एक्सप्रेशन नहीं पकड़ पाते। सुरक्षित मॉडलों पर 100% सटीकता, बैकबोन डेल्टा पर उच्च रिकॉल।

दोनों **सिमेंटिक आईडी** की गणना करते हैं - मानकीकृत सामग्री के FNV-1a हैश। समान अर्थ अभिसरण करता है, चाहे निष्कर्षण का मार्ग कुछ भी हो।

## सुरक्षा संबंधी नियम

- **शून्य मानकीकरण**: अस्पष्ट भाषा ("शायद Redis?") कभी भी निर्णय नहीं बनती है।
- **सलाहकार सीमा**: मेमोरी सुझावों में परिकल्पनाएं और शाखा-टैग की गई वस्तुएं शामिल नहीं हैं।
- **टाइप-स्कोपेड संशोधन**: निर्णय केवल निर्णयों को संशोधित कर सकते हैं, प्रतिबंध केवल प्रतिबंधों को संशोधित कर सकते हैं।
- **अस्वीकृति ओवर करप्शन**: अमान्य डेल्टा को अस्वीकार कर दिया जाता है, कभी भी चुपचाप अवशोषित नहीं किया जाता है।
- **उत्पत्ति की आवश्यकता**: प्रत्येक स्वीकृत डेल्टा के लिए स्रोत टर्न का पता लगाया जा सकता है।

## स्केलिंग परिणाम

| ट्रांसक्रिप्ट की लंबाई | संदर्भ बनाम कच्चा डेटा | आइटम वृद्धि |
|------------------|---------------|--------------|
| छोटा (9-14 टर्न) | कच्चे डेटा का 18-62% | लगभग रैखिक |
| लंबा (56-62 टर्न) | कच्चे डेटा का **12-24%** | उप-रैखिक (5x टर्न के लिए 2.9x आइटम) |

जितनी लंबी अवधि का सत्र होगा, उतना ही अधिक DeltaMind अपनी उपयोगिता साबित करेगा। क्वेरी स्कोर: सभी प्रकार के उपकरणों में 6/6।

## स्थिति

**पहला चरण से 5C चरण तक पूरा। 229 परीक्षण (192 मुख्य + 37 CLI)।**

- चरण 1: स्कीमा, रिकॉन्सिलर, अपरिवर्तनीयता, हैरनेस, अर्थशास्त्र
- चरण 2: नियम-आधारित एक्सट्रैक्टर, एलएलएम एक्सट्रैक्टर, हाइब्रिड पाइपलाइन, मॉडल स्वीप, संशोधन ऑन्टोलॉजी
- चरण 3: सत्र रनटाइम, परसिस्टेंस लेयर
- चरण 4: एआई-लोडआउट एडाप्टर, क्लाउड-मेमोरीज़ एडाप्टर, डॉगफूड हैरनेस
- चरण 5: एलएलएम डिफ़ॉल्ट रनटाइम, सिमेंटिक आइडेंटिटी, ऑपरेटर CLI

## लाइसेंस

एमआईटी

---

[MCP टूल शॉप](https://mcp-tool-shop.github.io/) द्वारा निर्मित।
