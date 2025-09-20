# History Pesanan Implementation with Approval System - TODO

## ✅ Completed Tasks

### 1. Created HistoryPesanan.js Component
- ✅ Display all orders made by the current client
- ✅ Show order details (car name, dates, price, status)
- ✅ Filter ongoing orders (diproses, disetujui, menunggu pembayaran, pembayaran berhasil)
- ✅ **Request-based editing**: "Ajukan Edit" instead of direct editing
- ✅ Modal for requesting date changes
- ✅ Submit edit request to Firestore with pending status
- ✅ **H-1 Restriction**: Cannot request edit within 1 day of start date
- ✅ **Visual Indicators**: Show edit request status (pending/approved/rejected)
- ✅ **Request Status Display**: Show when edit request is pending approval
- ✅ **Prevent Multiple Requests**: Disable button if request already pending

### 2. Updated ManajemenPesanan.js Component
- ✅ **Edit Request Display**: Show edit requests in order cards
- ✅ **Request Details**: Display new dates, price, and request timestamp
- ✅ **Approval Workflow**: Setujui Edit / Tolak Edit buttons
- ✅ **Apply Changes**: Update order dates when approved
- ✅ **Reject Handling**: Mark request as rejected
- ✅ **Notifications**: Send notifications to users for approval/rejection
- ✅ **Status Tracking**: Track approval/rejection timestamps

### 3. Updated App.js
- ✅ Added import for HistoryPesanan component
- ✅ Added protected route for /history-pesanan with client role requirement

### 4. Updated Navbar.js
- ✅ Added History icon import from lucide-react
- ✅ Added "History Pesanan" menu item to client navigation

## 🧪 Testing Checklist

### Client-Side Testing (HistoryPesanan.js)
- [ ] Test navigation to History Pesanan page
- [ ] Verify all user orders are displayed
- [ ] Test "Ajukan Edit" functionality for ongoing orders
- [ ] Test that edit request is disabled within H-1 of start date
- [ ] Test that edit request is disabled if already pending
- [ ] Verify edit request status indicators (pending/approved/rejected)
- [ ] Test modal form validation
- [ ] Verify Firebase updates for edit requests

### Admin-Side Testing (ManajemenPesanan.js)
- [ ] Test edit request display in order cards
- [ ] Test "Setujui Edit" functionality
- [ ] Test "Tolak Edit" functionality
- [ ] Verify order dates are updated when approved
- [ ] Verify notifications are sent to users
- [ ] Test with multiple edit requests
- [ ] Verify request status changes (pending → approved/rejected)

### Integration Testing
- [ ] Test complete workflow: Client request → Admin approval → Date update
- [ ] Test notification system for both approval and rejection
- [ ] Test with different order statuses
- [ ] Verify role-based access (only clients can request, only admins can approve)
- [ ] Test real-time updates when requests are processed

### UI/UX Testing
- [ ] Test responsive design on different screen sizes
- [ ] Verify status colors and indicators are correct
- [ ] Test loading states
- [ ] Verify empty state when no orders exist
- [ ] Test modal interactions and form validation
- [ ] **Test approval system UI**: Verify request display and approval buttons

### Edge Cases
- [ ] Test with orders that have missing data
- [ ] Test date validation (end date after start date)
- [ ] Test with very old orders
- [ ] Test cancel operation on different order statuses
- [ ] **Test approval edge cases**: Multiple requests, rapid approval/rejection
- [ ] **Test H-1 edge cases**: Orders starting exactly 1 day from now

## 🚀 Next Steps

1. **Testing**: Run the application and test all functionality including approval workflow
2. **Bug Fixes**: Address any issues found during testing
3. **Performance**: Optimize queries and rendering if needed
4. **Enhancements**: Consider adding:
   - Request history tracking
   - Bulk approval functionality
   - Request expiration
   - Email notifications

## 📝 Notes

- **Request System**: Clients submit edit requests that require admin approval
- **H-1 Restriction**: Edit requests cannot be made within 1 day of start date
- **Status Tracking**: Edit requests have pending/approved/rejected status
- **Real-time Updates**: Changes reflect immediately through Firestore listeners
- **Notifications**: Users receive notifications for approval/rejection
- **Visual Indicators**: Clear status display for edit requests
- **Prevention**: Cannot submit multiple pending requests for same order
- **Admin Workflow**: Dedicated approval buttons in order management

## 🔧 Technical Implementation

### Database Structure
```javascript
editRequest: {
  tanggalMulai: "2024-01-15",
  tanggalSelesai: "2024-01-17",
  durasiHari: 2,
  perkiraanHarga: 1000000,
  status: "pending", // "pending" | "approved" | "rejected"
  requestedAt: "2024-01-10T10:00:00.000Z",
  requestedBy: "userId",
  approvedAt: "2024-01-10T11:00:00.000Z", // optional
  rejectedAt: "2024-01-10T11:00:00.000Z"  // optional
}
```

### Workflow
1. Client clicks "Ajukan Edit" → Modal opens
2. Client selects new dates → Request submitted to Firestore
3. Admin sees request in ManajemenPesanan → Can approve/reject
4. If approved → Order dates updated, notification sent
5. If rejected → Request marked as rejected, notification sent
