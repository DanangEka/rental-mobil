# TODO: Add Rental Type Option (Driver or Lepas Kunci) in Booking Process with Payment System

## Langkah-langkah:
- [x] Add rentalType state in Home.js (default to "Lepas Kunci")
- [x] Add radio buttons for "Driver" and "Lepas Kunci" in the booking form for each car
- [x] Include rentalType in the addDoc call to Firestore when creating pemesanan
- [x] Update AdminDashboard.js to display rentalType column in pemesanan list
- [x] Add filter dropdown for rentalType in AdminDashboard
- [x] Add driver fee calculation (250,000) if rentalType is "Driver" in Home.js
- [x] Update AdminDashboard to set status to "menunggu pembayaran" instead of "disetujui"
- [x] Add payment form in Home.js for orders with status "menunggu pembayaran" (Metode Pembayaran and Bukti Pembayaran)
- [x] Add handlePaymentSubmit in Home.js for uploading payment proof to Firebase Storage
- [x] Add handlePaymentApproval in AdminDashboard.js to confirm payment
- [x] Update UI to show "Bukti Pembayaran Berhasil Diupload" after submission
- [x] Update UI to show "Pembayaran Telah Dikonfirmasi" after admin confirmation
- [x] Test booking with both rental types and verify data saves correctly
- [x] Verify AdminDashboard displays and filters pemesanan by rentalType
- [x] Test payment system end-to-end
- [x] Update storage.rules to allow authenticated users to upload payment proofs
- [ ] Deploy updated Firestore rules and storage.rules to Firebase (run: firebase deploy --only firestore:rules,storage)
- [ ] Test payment proof upload after deploying rules
