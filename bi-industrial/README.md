# 📊 BI Industrial

Dashboard interativo de indicadores industriais com persistência automática, gráficos por pilar e exportação/importação de Excel por setor.

---

## 🚀 Como publicar no GitHub Pages (passo a passo)

### 1. Criar o repositório

1. Acesse [github.com](https://github.com) e faça login
2. Clique em **New repository**
3. Nome sugerido: `bi-industrial`
4. Deixe **Public** (necessário para GitHub Pages gratuito)
5. Clique em **Create repository**

---

### 2. Ajustar o nome do repositório no vite.config.js

Abra `vite.config.js` e altere a linha `base` para o nome exato do seu repositório:

```js
base: "/bi-industrial/",   // ← troque pelo nome do SEU repositório
```

---

### 3. Enviar os arquivos

No terminal, dentro da pasta do projeto:

```bash
git init
git add .
git commit -m "feat: BI Industrial inicial"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/bi-industrial.git
git push -u origin main
```

---

### 4. Ativar o GitHub Pages

1. No repositório, vá em **Settings → Pages**
2. Em **Source**, selecione **GitHub Actions**
3. Salve

O deploy será disparado automaticamente. Aguarde ~1 minuto e acesse:

```
https://SEU_USUARIO.github.io/bi-industrial/
```

---

### 5. Deploys futuros

Qualquer `git push` para a branch `main` recompila e publica automaticamente em ~60 segundos.

---

## 💾 Persistência de dados

- Os dados são salvos **automaticamente** no `localStorage` do navegador 800ms após cada alteração
- Ao reabrir o app, os dados são restaurados automaticamente (indicador "💾 Dados restaurados" aparece na barra superior)
- O botão **🗑 Reset** apaga todos os dados salvos (pede confirmação)

> **Atenção:** o `localStorage` é por navegador/dispositivo. Para compartilhar dados entre equipes, use a exportação/importação de Excel por pilar.

---

## 📁 Estrutura do projeto

```
bi-industrial/
├── src/
│   ├── main.jsx              ← Ponto de entrada React
│   ├── App.jsx               ← Aplicação principal + persistência
│   ├── constants.js          ← Constantes, estado padrão, config dos pilares
│   ├── storage.js            ← Helpers de localStorage
│   ├── xlsx.js               ← Export/import Excel por pilar
│   └── components/
│       ├── KpiCard.jsx       ← Card de KPI com sparkline
│       ├── PilarSection.jsx  ← Seção de pilar com botões ⬇/⬆
│       ├── PilarCharts.jsx   ← Gráfico de barras mensais + linha diária
│       └── EntradaDados.jsx  ← Aba de entrada de dados
├── .github/
│   └── workflows/
│       └── deploy.yml        ← CI/CD automático para GitHub Pages
├── index.html
├── vite.config.js
└── package.json
```

---

## 📊 Pilares e Indicadores

| Pilar | Indicadores |
|---|---|
| 🦺 Segurança | Acidente c/ afastamento, s/ afastamento, dias sem acidente |
| ✅ Qualidade | Reclamações clientes, estoque CQ, reclamações atrasadas + responsável |
| ⚙️ Custo/Eficiência | Eficiência LMO, Litografia, Top 5 Perdas |
| 🚚 Entregas | Atendimento no prazo, lead time lito, estoque acabado, estoque litografado |
| 👥 Pessoas | Absenteísmo, orgânico LMO/Lito por turno, horas de treinamento |

---

## 🛠 Desenvolvimento local

```bash
npm install
npm run dev
```

Acesse `http://localhost:5173/bi-industrial/`
