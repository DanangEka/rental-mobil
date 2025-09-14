# TODO: Update Home.js to use nama and nomorTelepon for namaClient and telepon

## Steps to Complete:
- [x] Add import for `doc` and `getDoc` from firebase/firestore
- [x] Add state for `userData` using useState
- [x] Add function to fetch user data from 'users' collection using auth.currentUser.uid
- [x] Call the fetch function in useEffect after auth.currentUser check
- [x] Update handleSewa to use userData.nama for namaClient and userData.nomorTelepon for telepon
- [x] Add fallback values for namaClient and telepon if userData is not loaded
- [ ] Test the changes by creating an order and verifying the values in the pemesanan collection
