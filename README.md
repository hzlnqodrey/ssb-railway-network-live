# Swiss Railway Network Live Transit Map 🚂

A production-ready, interactive web application that visualizes live Swiss Railway Network transit data in real-time, similar to [Vasile's Swiss Railways Network](https://maps.vasile.ch/transit-sbb/).

## 🎯 Project Overview

This project creates an accessible, interactive, and impactful transit transportation website that helps people worldwide navigate the Swiss railway system using official SBB (Swiss Federal Railways) timetables and live data.

## 🏗️ Architecture

```
Swiss-Railway-Network-Live/
├── frontend/          # Next.js TypeScript React app
├── backend/           # Node.js API server (future)
├── docker-compose.yml # Development environment
├── docs/              # Project documentation
└── .github/           # CI/CD workflows
```

## ✨ Features

### MVP Deliverables
- **Interactive Map**: Real-time train movement visualization
- **Multiple Views**: Satellite, terrain, and standard map views
- **Accessibility**: Dark mode, font size controls, translations
- **Offline Support**: PWA with offline capabilities
- **Real-time Data**: Live train positions and schedules
- **Responsive Design**: Works on all devices

### Technical Stack
- **Frontend**: TypeScript + React (Next.js 14)
- **Styling**: Tailwind CSS + Shadcn/ui
- **Maps**: Leaflet.js or Mapbox GL JS
- **Data Fetching**: React Query (TanStack Query)
- **API**: Swiss Open Transport Data API
- **PWA**: Next.js PWA plugin
- **Tooling**: ESLint, Prettier, TypeScript strict mode

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- Docker & Docker Compose
- Git

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd Swiss-Railway-Network-Live
   ```

2. **Start development environment**
   ```bash
   docker-compose up --build
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - API: http://localhost:8000 (when implemented)

### Manual Setup

```bash
# Install frontend dependencies
cd frontend
npm install
npm run dev

# The app will be available at http://localhost:3000
```

## 📁 Project Structure

### Frontend (`/frontend`)
```
frontend/
├── src/
│   ├── app/           # Next.js 14 app router
│   ├── components/    # Reusable React components
│   ├── hooks/         # Custom React hooks
│   ├── lib/           # Utilities and configurations
│   ├── stores/        # State management (Zustand)
│   ├── styles/        # Global styles and Tailwind
│   └── types/         # TypeScript type definitions
├── public/            # Static assets
├── docs/              # Component documentation
└── tests/             # Test files
```

## 🛠️ Development

### Available Scripts

```bash
# Frontend development
cd frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
npm test             # Run tests
```

### Code Quality
- **ESLint**: Strict TypeScript and React rules
- **Prettier**: Consistent code formatting
- **Husky**: Pre-commit hooks for quality checks
- **TypeScript**: Strict mode enabled

## 🌍 API Integration

This project uses the [Swiss Open Transport Data API](https://opentransportdata.swiss/en/) for:
- Real-time train positions
- Station information
- Timetables and schedules
- Route planning

## 🔧 Configuration

### Environment Variables

Create `.env.local` files in respective directories:

```bash
# Frontend (.env.local)
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
NEXT_PUBLIC_SBB_API_KEY=your_sbb_api_key
```

## 📱 PWA Features

- **Offline Support**: Last viewed map data cached
- **Install Prompt**: Add to home screen capability
- **Background Sync**: Update data when connection returns
- **Push Notifications**: Train delay alerts (future feature)

## 🚀 Deployment

### Production Deployment
- **Frontend**: Vercel (recommended) or Netlify
- **Backend**: Docker containers on cloud providers
- **CDN**: Images and assets via Vercel Edge Network

### CI/CD Pipeline
- GitHub Actions for automated testing and deployment
- Docker image building and registry push
- Automated quality checks and security scanning

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Vasile Coțovanu](https://maps.vasile.ch/transit-sbb/) for the original inspiration
- [Swiss Federal Railways (SBB)](https://www.sbb.ch/) for providing open data
- [OpenTransportData.swiss](https://opentransportdata.swiss/) for API access

## 📞 Support

If you have any questions or need help, please [open an issue](../../issues) or reach out to the development team.

---

**Happy Coding! 🚂✨**
