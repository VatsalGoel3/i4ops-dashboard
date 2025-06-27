# i4ops Dashboard

A modern dashboard for monitoring and managing baremetal hosts and virtual machines.

## Architecture

- **Backend**: Node.js + Express + Prisma + PostgreSQL
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Authentication**: Supabase Auth
- **Real-time Updates**: Server-Sent Events (SSE)

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 12+
- Supabase project (for authentication)

### Development Setup

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd i4ops-dashboard
   
   # Install backend dependencies
   cd server
   npm install
   
   # Install frontend dependencies
   cd ../dashboard
   npm install
   ```

2. **Configure environment**
   ```bash
   # Backend configuration
   cp server/.env.example server/.env
   # Edit server/.env with your database and Tailscale credentials
   
   # Frontend configuration
   cp dashboard/.env.example dashboard/.env
   # Edit dashboard/.env with your Supabase credentials
   ```

3. **Setup database**
   ```bash
   cd server
   npm run prisma:migrate
   npm run prisma:seed
   npm run populate:hosts  # Populate hosts from Tailscale
   ```

4. **Start development servers**
   ```bash
   # Terminal 1: Backend (port 4000)
   cd server
   npm run dev
   
   # Terminal 2: Frontend (port 5173)
   cd dashboard
   npm run dev
   ```

5. **Access the application**
   - Dashboard: http://localhost:5173
   - API: http://localhost:4000/api/health

## Production Deployment

### Simple Deployment

```bash
# Deploy to remote server
./deploy.sh production your-server-ip manual

# Or for local deployment
./deploy.sh local localhost manual
```

### Manual Deployment

1. **Build applications**
   ```bash
   # Build backend
   cd server
   npm run build
   
   # Build frontend
   cd ../dashboard
   npm run build
   ```

2. **Setup production environment**
   - Install PM2: `npm install -g pm2`
   - Configure nginx reverse proxy
   - Setup SSL certificates

3. **Start services**
   ```bash
   # Start backend with PM2
   cd server
   pm2 start dist/index.js --name i4ops-backend
   
   # Serve frontend with nginx or static server
   cd ../dashboard
   python3 -m http.server 8888
   ```

## Features

- **Host Monitoring**: Real-time status, resource usage, SSH connectivity
- **VM Management**: Virtual machine status, resource allocation, telemetry
- **Pipeline Management**: Host assignment, status tracking, workflow management
- **Real-time Updates**: Live data updates via SSE
- **Search & Filtering**: Global search across hosts and VMs
- **Audit Logging**: Track changes and user actions
- **Responsive Design**: Works on desktop and mobile devices

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/hosts` - List all hosts
- `GET /api/vms` - List all VMs
- `GET /api/events` - SSE endpoint for real-time updates
- `PUT /api/hosts/:id` - Update host information
- `GET /api/audit-logs` - Get audit history

## Configuration

### Environment Variables

**Backend (.env)**
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/i4ops_dashboard
SSH_USER=i4ops
SSH_PASSWORD=your_password
TS_OAUTH_CLIENT_ID=your_tailscale_client_id
TS_OAUTH_CLIENT_SECRET=your_tailscale_client_secret
TAILNET=your_tailnet
```

**Frontend (.env)**
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_BASE_URL=http://localhost:4000/api
```

## Development

### Available Scripts

**Backend**
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run prisma:migrate # Run database migrations
npm run prisma:seed  # Seed database with sample data
npm run populate:hosts # Populate hosts from Tailscale
```

**Frontend**
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Database Schema

The application uses Prisma with PostgreSQL. Key models:

- **Host**: Physical machines with status, resources, pipeline stage
- **VM**: Virtual machines with status, resources, host association
- **AuditLog**: Change tracking and user activity
- **PollHistory**: Historical polling data

## Troubleshooting

### Common Issues

1. **Database connection failed**
   - Verify PostgreSQL is running
   - Check DATABASE_URL in server/.env
   - Run `npm run prisma:migrate`

2. **Frontend can't connect to API**
   - Verify backend is running on port 4000
   - Check CORS configuration
   - Verify VITE_API_BASE_URL in dashboard/.env

3. **Host polling not working**
   - Check SSH credentials in server/.env
   - Verify Tailscale OAuth configuration
   - Run `npm run populate:hosts` to populate initial data

### Logs

- Backend logs: `pm2 logs i4ops-backend`
- Frontend logs: Browser developer console
- Database logs: PostgreSQL logs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

[Add your license here]
