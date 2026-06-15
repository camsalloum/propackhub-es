<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-2xl text-[#1363a6] leading-tight">
            {{ __('Projects') }}
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
            .table-center tr td,
            .table-center tr th {
                text-align: center !important;
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
                <div class="p-6 bg-white border-b border-gray-200 mt-5 user-table table-center">
                	<div class="flex justify-center mb-4">
			            <a href="{{ route('forms.create') }}" class="px-4 py-2  text-white rounded-lg " style="background-color: rgb(19, 99, 166);">
			                Add New Project
			            </a>
			        </div>
                    <div class="overflow-x-auto">
                        <table id="userTable" class="w-full  table-auto border-collapse text-sm text-left text-gray-700">
                            <thead class="bg-gray-200 text-gray-800">
                                <tr>
                                    <th class="px-6 py-3 text-center font-medium uppercase text-white">#</th>
                                    <th class="px-6 py-3 font-medium uppercase text-white">Customer Name</th>
                                    <th class="px-6 py-3 font-medium uppercase text-white">Job Name</th>
                                    <th class="px-6 py-3 font-medium uppercase text-white">Product Type</th>
                                    <th class="px-6 py-3 font-medium uppercase text-white">Project Number</th>
                                    <th class="px-6 py-3 font-medium uppercase text-white">Order Quantity</th>
                                    <th class="px-6 py-3 font-medium uppercase text-white">Units</th>
                                    <th class="px-6 py-3 text-center font-medium uppercase text-white">Project Date</th>
                                    @if (auth()->user()->user_level == 'level-1' || auth()->user()->user_type == 'admin')
                                    <th class="px-6 py-3 text-center font-medium uppercase text-white">Actions</th>
                                    @endif
                                </tr>
                            </thead>
                            <tbody>
                            	@if(!empty($latestRecord))
                                @foreach ($latestRecord as $record)
                                    <tr class="border-b hover:bg-gray-100">
                                        <td class="px-6 py-4 text-center">{{ $loop->iteration }}</td>
                                        <td class="px-6 py-4">{{ $record->customerName }}</td>
                                        <td class="px-6 py-4">{{ $record->jobName }}</td>
                                        <td class="px-6 py-4">{{ $record->productType }}</td>
                                        <td class="px-6 py-4">{{ $record->projectNumber }}</td>
                                        <td class="px-6 py-4">{{ $record->orderQuantity }}</td>
                                        <td class="px-6 py-4">{{ $record->units }}</td>
                                        <td class="px-6 py-4">{{ $record->project_date }}</td>
                                        

                                        
                                        @if (auth()->user()->user_level == 'level-1' || auth()->user()->user_type == 'admin')
                                        <td class="px-6 py-4 text-center">
                                        
                                            <div class="flex justify-center items-center space-x-4">
                                                <div class="flex justify-center items-center space-x-4">
                                                    <a 
                                                        href="{{ route('forms.show', $record->id) }}" 
                                                        class="text-blue-600 hover:text-blue-800">
                                                        <i class="fas fa-eye"></i>
                                                    </a>
                                                </div>
                                                <a href="{{ route('forms.edit', $record->id) }}" class="text-green-600 hover:text-green-800">
                                                    <i class="fas fa-edit"></i>
                                                </a>
                                                <button 
                                                    onclick="confirmDelete('{{ $record->id }}')" 
                                                    class="text-red-600 hover:text-red-800">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        </td>
                                        @endif
                                    </tr>
                                @endforeach
                                @endif
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>


    <!-- DataTables Styles -->
    <link rel="stylesheet" href="https://cdn.datatables.net/1.13.6/css/jquery.dataTables.min.css">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" rel="stylesheet">

    <!-- jQuery and DataTables Scripts -->
    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js"></script>

    <!-- SweetAlert2 -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

    <script>
        jQuery('#userTable').DataTable({
            scrollX: true,
            autoWidth: false,
            responsive: true,
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


        function confirmDelete(userId) {
            Swal.fire({
                title: 'Are you sure you want to delete this Form?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc3545',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Yes, delete it!'
            }).then((result) => {
                if (result.isConfirmed) {
                    jQuery.ajax({
                        url: `/forms/${userId}`,
                        method: 'POST',
                        data: {
                            _method: 'DELETE',
                            _token: '{{ csrf_token() }}'
                        },
                        success: function(response) {
                            Swal.fire(
                                'Deleted!',
                                'Form has been deleted successfully.',
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

    </script>
</x-app-layout>
