<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.md">English</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/deltamind/readme.png" width="400" alt="DeltaMind" />
</p>

<p align="center">
  <strong>State-as-memory for AI agents</strong><br>
  Typed deltas &bull; Reconciliation &bull; Provenance &bull; Context export
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@deltamind/core"><img src="https://img.shields.io/npm/v/@deltamind/core" alt="npm" /></a>
  <a href="https://github.com/mcp-tool-shop-org/deltamind/blob/main/LICENSE"><img src="https://img.shields.io/github/license/mcp-tool-shop-org/deltamind" alt="license" /></a>
</p>

---

## यह क्या है?

`@deltamind/core` डेल्टामाइंड के लिए रनटाइम इंजन है—एक ऐसा सिस्टम जो "मेमोरी के रूप में ट्रांसक्रिप्ट" को "मेमोरी के रूप में स्टेट" से बदलता है, जो एआई एजेंटों के लिए है।

पुराने संदेशों को फिर से पढ़ने के बजाय, एजेंट टाइप किए गए "डेल्टा" (लक्ष्य-सेट, निर्णय, बाधा, कार्य, संशोधन...) उत्सर्जित करते हैं, जिन्हें एक मानक स्थिति में समेकित किया जाता है। उस स्थिति को किसी भी आगे के उपयोग के लिए, टोकन-बजट वाली संदर्भ ब्लॉक के रूप में निर्यात किया जा सकता है।

## इंस्टॉल करें

```bash
npm install @deltamind/core
```

## शुरुआत कैसे करें

```typescript
import { createSession } from '@deltamind/core';

const session = createSession();

session.ingest({
  role: 'user',
  content: 'Build a REST API for the inventory service'
});

const result = session.process();
// result.accepted → deltas that passed reconciliation
// result.rejected → deltas that violated invariants

const context = session.exportContext({ maxChars: 4000 });
// Token-budgeted state block ready for any LLM
```

## मुख्य अवधारणाएं

- **डेल्टा:** टाइप किए गए स्थिति परिवर्तन (11 प्रकार: लक्ष्य-सेट, निर्णय, बाधा, कार्य, संशोधन, प्राथमिकता, संदर्भ-एंकर, खुला प्रश्न, अंतर्दृष्टि, धारणा, निर्भरता)।
- **समेकन:** 7 अपरिवर्तनीय नियमों का पालन (कोई डुप्लिकेट नहीं, कोई विरोधाभास नहीं, केवल संशोधन, आदि)।
- **उत्पत्ति:** स्वीकृत, अस्वीकृत और क्यों, इसकी पूरी घटना लॉग।
- **सिमेंटिक आईडी:** डुप्लिकेट हटाने के लिए सामग्री-आधारित पहचान।
- **संदर्भ निर्यात:** प्राथमिकता-क्रमित, बजट-जागरूक स्थिति प्रस्तुति।

## लिंक

- [GitHub](https://github.com/mcp-tool-shop-org/deltamind)
- [हैंडबुक](https://mcp-tool-shop-org.github.io/deltamind/handbook/)
- [सीएलआई पैकेज](https://www.npmjs.com/package/@deltamind/cli)

## लाइसेंस

एमआईटी
