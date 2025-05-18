
# GitHub Repository Visualizer

Visualize any GitHub repository’s architecture using AI-powered diagrams and analysis.

## 🔍 What It Does

This web app analyzes a GitHub repository and generates:
- An interactive Mermaid.js diagram of the code structure
- An AI-generated analysis of the architecture and components

It helps developers quickly understand unfamiliar repositories.

---

## 🚀 How to Use

### Option 1: Paste a GitHub Repo URL

Go to [repo-visualizer.vercel.app](https://repo-visualizer.vercel.app)  
Paste any GitHub repo URL, like:
[https://github.com/siddanth-6365/TrackIt-AI](https://github.com/siddanth-6365/TrackIt-AI)


And you'll instantly get a diagram + explanation.

### Option 2: Use the URL Shortcut

Change:
```

https://github.com/<owner>/<repo>

```

To:
```

https://repo-visualizer.vercel.app/<owner>/<repo>

```

✅ Example:

[https://github.com/siddanth-6365/TrackIt-AI](https://github.com/siddanth-6365/TrackIt-AI)
-> 
[https://repo-visualizer.vercel.app/siddanth-6365/TrackIt-AI](https://repo-visualizer.vercel.app/siddanth-6365/TrackIt-AI)


---

## 🧠 AI Model

We use Groq’s blazing-fast LLaMA 4 model:

```

meta-llama/llama-4-maverick-17b-128e-instruct

````

To:
- Parse README + file tree
- Generate architectural explanation
- Create Mermaid.js diagrams

---

## 🛠 Tech Stack

- **Next.js 13 (App Router)**
- **Tailwind CSS**
- **shadcn/ui**
- **Mermaid.js**
- **Groq LLaMA-4 API**
- **GitHub REST API**
