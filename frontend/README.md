# Crowdfunding DApp Frontend

A modern, responsive frontend for the Crowdfunding DApp built with Next.js, Tailwind CSS, and ethers.js.

## 🚀 Features

### Core Functionality
- **Wallet Connection**: MetaMask integration with account switching and balance display
- **Campaign Management**: Create campaigns, add rewards, and withdraw funds
- **Campaign Participation**: Browse campaigns, pledge funds, and claim rewards
- **User Dashboard**: Track contributions, created campaigns, and overall statistics

### UI/UX Features
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Real-time Updates**: Live countdown timers and progress bars
- **Toast Notifications**: User-friendly feedback for all transactions
- **Loading States**: Smooth loading indicators throughout the app
- **Error Handling**: Comprehensive error handling with user-friendly messages

### Campaign Features
- **Campaign Cards**: Visual representation with progress bars and status badges
- **Campaign Details**: Comprehensive modal view with contribution forms
- **Reward System**: Add and select rewards for different contribution tiers
- **Status Tracking**: Real-time campaign status (Active, Success, Failed)

## 🛠️ Technical Stack

- **Framework**: Next.js 15.5.2 with App Router
- **Styling**: Tailwind CSS for responsive design
- **Web3**: ethers.js for blockchain interactions
- **Notifications**: react-hot-toast for user feedback
- **State Management**: React hooks for local state
- **TypeScript**: Full type safety throughout the application

## 📱 Responsive Design

The frontend is designed to work seamlessly across all devices:
- **Desktop**: Full sidebar navigation with detailed tables
- **Tablet**: Collapsible sidebar with optimized layouts
- **Mobile**: Mobile-first design with touch-friendly interactions

## 🔧 Installation & Setup

1. **Install Dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Environment Setup**:
   - Ensure your smart contract is deployed
   - Update `src/constants/deployments.localhost.json` with your contract address
   - Make sure MetaMask is installed in your browser

3. **Start Development Server**:
```bash
npm run dev
   ```

4. **Open Browser**:
   Navigate to `http://localhost:3000`

## 🎯 User Workflows

### For Campaign Creators
1. **Connect Wallet**: Use MetaMask to connect your wallet
2. **Create Campaign**: Set goal, timeline, and description
3. **Add Rewards**: Create reward tiers before campaign starts
4. **Monitor Progress**: Track pledges and campaign status
5. **Withdraw Funds**: Collect funds after successful campaign

### For Contributors
1. **Browse Campaigns**: View all active campaigns with progress
2. **Select Campaign**: Click on campaign cards for detailed view
3. **Choose Reward**: Select from available reward tiers
4. **Make Pledge**: Contribute ETH to support the campaign
5. **Track Status**: Monitor campaign progress and your contributions

## 🎨 UI Components

### Campaign Cards
- Progress bars showing funding progress
- Status badges (Active, Goal Met, Failed)
- Countdown timers for start/end times
- Creator identification and campaign metadata

### Dashboard Tables
- **Contributions Table**: Track all your pledges across campaigns
- **Created Campaigns**: Manage campaigns you've created
- **Statistics**: Total contributed amount and campaigns backed

### Modals
- **Create Campaign**: Form with validation and time formatting
- **Add Reward**: Reward creation with quantity limits
- **Campaign Details**: Comprehensive campaign information and actions

## 🔒 Security Features

- **Input Validation**: Client-side validation for all forms
- **Error Handling**: Graceful error handling for failed transactions
- **MetaMask Integration**: Secure wallet connection
- **Transaction Confirmation**: User confirmation for all blockchain operations

## 📊 Real-time Features

- **Live Countdowns**: Real-time campaign start/end timers
- **Progress Updates**: Live funding progress bars
- **Status Changes**: Dynamic status updates based on current time
- **Balance Updates**: Real-time wallet balance display

## 🧪 Testing with Multiple Accounts

The frontend is designed for testing with multiple MetaMask accounts:
- **Multiple Tabs**: Open different tabs for different accounts
- **Account Switching**: Easy MetaMask account switching
- **Isolated State**: Each tab maintains independent state
- **Responsive Layout**: Test side-by-side on different screen sizes

## 🚨 Error Handling

- **Network Errors**: Graceful handling of blockchain connection issues
- **Transaction Failures**: User-friendly error messages for failed operations
- **Validation Errors**: Form validation with helpful error messages
- **Loading States**: Clear indication of ongoing operations

## 🔄 State Management

- **Local State**: React hooks for component-level state
- **Global State**: Shared state for user account and campaigns
- **Real-time Updates**: Automatic refresh after successful operations
- **Persistent Data**: Campaign data persistence across sessions

## 📱 Mobile Optimization

- **Touch-Friendly**: Optimized for touch interactions
- **Responsive Tables**: Horizontal scrolling for mobile devices
- **Collapsible Sidebar**: Mobile-friendly navigation
- **Optimized Forms**: Mobile-optimized input fields and buttons

## 🎯 Future Enhancements

- **IPFS Integration**: Better metadata handling
- **Social Features**: Campaign sharing and social proof
- **Analytics**: Campaign performance metrics
- **Notifications**: Push notifications for campaign updates
- **Multi-chain Support**: Support for other blockchain networks

## 🐛 Troubleshooting

### Common Issues
1. **MetaMask Not Found**: Ensure MetaMask is installed and unlocked
2. **Contract Connection Failed**: Check contract address and network
3. **Transaction Pending**: Wait for blockchain confirmation
4. **Loading Issues**: Refresh page and reconnect wallet

### Debug Mode
Enable browser console logging for detailed error information and debugging.

## 📄 License

This project is licensed under the MIT License.
