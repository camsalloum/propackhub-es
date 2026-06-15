<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-2xl text-[#1363a6] leading-tight">
            {{ __('User Listing') }}
        </h2>
    </x-slot>
        <style>
            input[type="search"] {
                margin-bottom: 10px;
            }
            th {
                color: #1363a6;
            }
            .bg-gray-200 {
                background-color: #1363a6;
                color: white;
            }
            .hover\:bg-gray-100:hover {
                background-color: #e0f3ff;
            }
            .p-6.bg-white.border-b.border-gray-200.mt-5.user-table{
                border-color:#1363a6;
            }
             .dataTables_wrapper .dataTables_length select {
                padding-right: 40px !important;
            }
        </style>
    <div class="py-8 mt-5" style="border-color: #1363a6;">
        <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">

            <!-- Success Message -->
            @if (session('success'))
                <div class="mb-6 px-4 py-3 bg-green-100 border border-green-400 text-green-700 rounded-lg">
                    <strong>Success!</strong> {{ session('success') }}
                </div>
            @endif

            <div class="bg-white shadow-md sm:rounded-lg">
                <div class="p-6 bg-white border-b border-gray-200 mt-5 user-table">
                    <div class="overflow-x-auto">
                        <table id="userTable" class="w-full  table-auto border-collapse text-sm text-left text-gray-700">
                            <thead class="bg-gray-200 text-gray-800">
                                <tr>
                                    <th class="px-6 py-3 text-center font-medium uppercase text-white">#</th>
                                    <th class="px-6 py-3 font-medium uppercase text-white">Name</th>
                                    <th class="px-6 py-3 font-medium uppercase text-white">Email</th>
                                    <th class="px-6 py-3 font-medium uppercase text-white">User level</th>
                                    <th class="px-6 py-3 font-medium uppercase text-white">User Since</th>
                                    <th class="px-6 py-3 font-medium uppercase text-white">Company Name</th>
                                    <th class="px-6 py-3 font-medium uppercase text-white">Company Type</th>
                                    <th class="px-6 py-3 font-medium uppercase text-white">Company Website</th>
                                    <th class="px-6 py-3 font-medium uppercase text-white">Country</th>
                                    <th class="px-6 py-3 font-medium uppercase text-white">User Status</th>
                                    <th class="px-6 py-3 text-center font-medium uppercase text-white">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                @foreach ($users as $user)
                                    <tr class="border-b hover:bg-gray-100">
                                        <td class="px-6 py-4 text-center">{{ $loop->iteration }}</td>
                                        <td class="px-6 py-4">{{ $user->name }}</td>
                                        <td class="px-6 py-4">{{ $user->email }}</td>
                                        <td class="px-6 py-4">
                                            @if($user->user_level === 'level-1')
                                                Full Access
                                            @elseif($user->user_level === 'level-2')
                                                Partial Access
                                            @else
                                                No Access
                                            @endif
                                        </td>
                                        <td class="px-6 py-4">{{ $user->created_at }}</td>
                                        <td class="px-6 py-4">{{ $user->company_name }}</td>
                                        <td class="px-6 py-4">{{ $user->company_type }}</td>
                                        <td class="px-6 py-4">{{ $user->company_website }}</td>
                                        <td class="px-6 py-4">{{ $user->country }}</td>
                                        <td class="px-6 py-4">
                                            <div class="flex items-center space-x-4">
                                                <span class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg">
                                                    Current: {{ ucfirst($user->user_status) }}
                                                </span>
                                                @if (!in_array($user->user_status, ['approve', 'reject']))
                                                <button 
                                                    onclick="updateUserStatus('{{ $user->id }}', 'approve')" 
                                                    class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
                                                    Approve
                                                </button>
                                                <button 
                                                    onclick="updateUserStatus('{{ $user->id }}', 'reject')" 
                                                    class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                                                    Reject
                                                </button>
                                                @endif
                                            </div>
                                        </td>
                                        <td class="px-6 py-4 text-center">
                                            <div class="flex justify-center items-center space-x-4">
                                                <div class="flex justify-center items-center space-x-4">
                                                    <button 
                                                        onclick="showUserDetails('{{ $user->id }}')" 
                                                        class="text-blue-600 hover:text-blue-800">
                                                        <i class="fas fa-eye"></i>
                                                    </button>
                                                </div>
                                                <a href="{{ route('users.edit', $user->id) }}" class="text-green-600 hover:text-green-800">
                                                    <i class="fas fa-edit"></i>
                                                </a>
                                                <button 
                                                    onclick="confirmDelete('{{ $user->id }}')" 
                                                    class="text-red-600 hover:text-red-800">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                @endforeach
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- User Details Modal -->
    <div id="userDetailsModal" class="fixed inset-0 bg-gray-800 bg-opacity-75 flex justify-center items-center hidden z-50">
        <div class="bg-white rounded-lg p-6 w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl mx-4 shadow-lg">
            <div class="flex justify-between items-center border-b pb-2">
                <h3 class="text-xl font-bold text-[#1363a6]">User Details</h3>
                <button onclick="closeModal()" class="text-gray-500 hover:text-gray-700">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div id="modalContent" class="mt-4">
                <p class="text-gray-700">Loading...</p>
            </div>
            <div class="mt-6 text-right">
                <button onclick="closeModal()" class="px-4 py-2 bg-[#1363a6] text-white rounded-lg hover:bg-blue-700 transition duration-300">
                    Close
                </button>
            </div>
        </div>
    </div>
 <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js"></script>
    <!-- DataTables Styles -->
    <link rel="stylesheet" href="https://cdn.datatables.net/1.13.6/css/jquery.dataTables.min.css">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" rel="stylesheet">

    <!-- jQuery and DataTables Scripts -->
   
    <script src="https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js"></script>
    <script src="https://cdn.datatables.net/buttons/2.4.2/js/dataTables.buttons.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.js"></script>
    <script src="https://cdn.datatables.net/buttons/2.4.2/js/buttons.html5.min.js"></script>
    <script src="https://cdn.datatables.net/buttons/2.4.2/js/buttons.print.min.js"></script>


    <!-- SweetAlert2 -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

    <script>
        jQuery('#userTable').DataTable({
                scrollX: true,
                autoWidth: false,
                responsive: true,
                dom: 'Bfrtip', // Add buttons to the table
                buttons: [
                    {
                        extend: 'copyHtml5',
                        text: '<i class="fas fa-copy"></i> Copy',
                        className: 'bg-blue-500 text-white px-3 py-2 rounded-lg'
                    },
                    {
                        extend: 'csvHtml5',
                        text: '<i class="fas fa-file-csv"></i> CSV',
                        className: 'bg-green-500 text-white px-3 py-2 rounded-lg'
                    },
                    {
                        extend: 'excelHtml5',
                        text: '<i class="fas fa-file-excel"></i> Excel',
                        className: 'bg-yellow-500 text-white px-3 py-2 rounded-lg'
                    }
                ],
                language: {
                    search: "Search Project:",
                    lengthMenu: "Show _MENU_ entries per page",
                    info: "Showing _START_ to _END_ of _TOTAL_ entries",
                    paginate: {
                        previous: "<i class='fas fa-chevron-left'></i>",
                        next: "<i class='fas fa-chevron-right'></i>"
                    }
                },
                columnDefs: [
                    { orderable: false, targets: -1 } // Disable ordering on the Actions column
                ]
            });

        function updateUserStatus(userId, action) {
            const actionText = action === 'approve' ? 'approve' : 'reject';

            Swal.fire({
                title: `Are you sure you want to ${actionText} this user?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: action === 'approve' ? '#28a745' : '#dc3545',
                cancelButtonColor: '#6c757d',
                confirmButtonText: `Yes, ${actionText} it!`
            }).then((result) => {
                if (result.isConfirmed) {
                    jQuery.ajax({
                        url: `/users/${userId}/status`,
                        method: 'POST',
                        data: {
                            _token: '{{ csrf_token() }}',
                            status: action
                        },
                        success: function(response) {
                            Swal.fire(
                                'Updated!',
                                `User has been ${actionText}d successfully.`,
                                'success'
                            ).then(() => {
                                location.reload();
                            });
                        },
                        error: function() {
                            Swal.fire(
                                'Error!',
                                'Something went wrong. Please try again.',
                                'error'
                            );
                        }
                    });
                }
            });
        }

        function confirmDelete(userId) {
            Swal.fire({
                title: 'Are you sure you want to delete this user?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc3545',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Yes, delete it!'
            }).then((result) => {
                if (result.isConfirmed) {
                    jQuery.ajax({
                        url: `/users/${userId}`,
                        method: 'POST',
                        data: {
                            _method: 'DELETE',
                            _token: '{{ csrf_token() }}'
                        },
                        success: function(response) {
                            Swal.fire(
                                'Deleted!',
                                'User has been deleted successfully.',
                                'success'
                            ).then(() => {
                                location.reload();
                            });
                        },
                        error: function() {
                            Swal.fire(
                                'Error!',
                                'Something went wrong. Please try again.',
                                'error'
                            );
                        }
                    });
                }
            });
        }

    function showUserDetails(userId) {
    const modal = document.getElementById('userDetailsModal');
    const modalContent = document.getElementById('modalContent');

    // Show loading message
    modalContent.innerHTML = '<p>Loading...</p>';

    // Fetch user details
    jQuery.ajax({
        url: `/users/${userId}`,
        method: 'GET',
        success: function(response) {
            modalContent.innerHTML = `
                <p><strong>Name:</strong> ${response.name}</p>
                <p><strong>Email:</strong> ${response.email}</p>
                <p><strong>Company Name:</strong> ${response.company_name}</p>
                <p><strong>Job Title:</strong> ${response.full_job_title}</p>
                <p><strong>Company Type:</strong> ${response.company_type}</p>
                <p><strong>Company Website:</strong> ${response.company_website}</p>
                <p><strong>Country:</strong> ${response.country}</p>
            `;
        },
        error: function() {
            modalContent.innerHTML = '<p>Error loading user details. Please try again.</p>';
        }
    });

    // Show the modal
    modal.classList.remove('hidden');
}

function closeModal() {
    const modal = document.getElementById('userDetailsModal');
    modal.classList.add('hidden');
}
    </script>
</x-app-layout>
