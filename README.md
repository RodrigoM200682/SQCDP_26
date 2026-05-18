# Quadro SQCDP — Gestão Diária

Painel interativo de gestão diária com os pilares **S**egurança, **Q**ualidade, **C**usto/Eficiência, **D**entrega e **P**essoas.

## ✅ Pré-requisitos

- [Node.js LTS](https://nodejs.org) instalado

## 🚀 Como rodar

Abra o terminal na pasta do projeto e execute:

```bash
# 1. Instalar dependências (só na primeira vez)
npm install

# 2. Rodar o servidor de desenvolvimento
npm run dev
```

Acesse **http://localhost:5173** no navegador.

## 📦 Gerar versão para produção

```bash
npm run build
```

Os arquivos finais ficam na pasta `dist/` — podem ser hospedados em qualquer servidor web estático (Vercel, Netlify, GitHub Pages, etc.).

## 💾 Sobre o salvamento de dados

Os dados são salvos automaticamente no **localStorage** do navegador. Isso significa:

- ✅ Os dados persistem entre sessões no mesmo navegador/computador
- ✅ Use o botão **⬇ Exportar** para fazer backup em arquivo `.json`
- ✅ Use o botão **⬆ Importar** para restaurar um backup
- ⚠️ Dados não são compartilhados entre computadores diferentes

## 🛠️ Tecnologias

- [React 18](https://react.dev)
- [Vite 5](https://vitejs.dev)
- [Recharts](https://recharts.org)
