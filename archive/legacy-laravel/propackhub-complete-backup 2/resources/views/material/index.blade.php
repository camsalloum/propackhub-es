

<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-2xl text-[#1363a6] leading-tight">
            {{ __('Material Values') }}
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
            .swal2-confirm{
            background-color:#1363a6 !important;
            }
            .swal2-icon{
            border-color: #1363a6 !important;
            color:#1363a6 !important;
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
                	<div class="flex justify-end mb-4">
			        </div>
                        <div class="flex justify-end mb-4">
                            <a href="{{ route('materials.create') }}" 
                            class="px-4 py-2 text-white rounded-lg hover:bg-[#0e4b87]" 
                            style="background-color: #1363a6;">
                            Add Material Values
                            </a>
                        </div>
                    <div class="overflow-x-auto">
                        <table id="userTable" class="w-full  table-auto border-collapse text-sm text-left text-gray-700">
                            <thead class="bg-gray-200 text-gray-800">
                                <tr>
                                    <th class="px-6 py-3 text-center font-medium uppercase text-white">#</th>
                                    <th class="px-6 py-3 font-medium uppercase text-white">Type</th>
                                    <th class="px-6 py-3 font-medium uppercase text-white">Material Name</th>
                                    <th class="px-6 py-3 font-medium uppercase text-white">Solid</th>
                                    <th class="px-6 py-3 font-medium uppercase text-white">Density</th>
                                    @if (auth()->user()->user_level == 'level-1' || auth()->user()->user_type == 'admin')
                                    <th class="px-6 py-3 text-center font-medium uppercase text-white">Actions</th>
                                    @endif
                                </tr>
                            </thead>
                            <tbody>
                            	@if(!empty($materials))
                                @foreach ($materials as $record)
                                    <tr class="border-b hover:bg-gray-100">
                                        <td class="px-6 py-4 text-center">{{ $loop->iteration }}</td>
                                        <td class="px-6 py-4 text-center">{{ $record->subcategory ? $record->subcategory->category->category_name ?? 'N/A' : 'N/A'}}</td>
                                        <td class="px-6 py-4 text-center">{{  $record->subcategory->name ?? 'N/A'  }}</td>
                                        <td class="px-6 py-4">{{ $record->solid }}</td>
                                        <td class="px-6 py-4">{{ $record->density }}</td>
                                        <td class="px-6 py-4 text-center">
                                            <div class="flex justify-center items-center space-x-4">
                                                <!-- View Button -->
                                                <a href="javascript:void(0);" onclick="viewMaterial({{ $record->id }})" 
                                                    class="text-blue-600 hover:text-blue-800">
                                                    <i class="fas fa-eye"></i>
                                                </a>

                                                <!-- Edit Button -->
                                                <a href="{{ route('materials.edit', $record->id) }}" 
                                                    class="text-green-600 hover:text-green-800">
                                                    <i class="fas fa-edit"></i>
                                                </a>

                                                <!-- Delete Button -->
                                                <button onclick="deleteMaterial({{ $record->id }})" 
                                                    class="text-red-600 hover:text-red-800">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        </td>

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
                search: "Search:",
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
    </script>

    <script>
    // Function to View Material Details
function viewMaterial(id) {
    jQuery.ajax({
        url: `{{ route('material-show', '') }}/${id}`,
        type: 'GET',
        success: function(response) {
            Swal.fire({
                title: '<h2 class="text-lg font-semibold text-blue-700">Material Details</h2>',
                html: `
                    <div style="text-align: left; font-size: 16px; padding: 10px;">
                        <table style="width:100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px; font-weight: bold;"><i class="fas fa-tag text-blue-500"></i> Name:</td>
                                <td style="padding: 8px;">${response.name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; font-weight: bold;"><i class="fas fa-cube text-gray-500"></i> Solid:</td>
                                <td style="padding: 8px;">${response.solid}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; font-weight: bold;"><i class="fas fa-weight-hanging text-red-500"></i> Density:</td>
                                <td style="padding: 8px;">${response.density}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; font-weight: bold;"><i class="fas fa-dollar-sign text-green-500"></i> Cost Per Kg:</td>
                                <td style="padding: 8px;">${response.costPerKg}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; font-weight: bold;"><i class="fas fa-recycle text-yellow-500"></i> Waste:</td>
                                <td style="padding: 8px;">${response.waste}</td>
                            </tr>
                        </table>
                    </div>
                `,
                icon: 'info',
                confirmButtonText: '<i class="fas fa-check-circle"></i> Close',
                confirmButtonColor: '#1363a6'
            });
        },
        error: function(xhr) {
            Swal.fire('Error', 'Material not found!', 'error');
            console.log(xhr.responseText);
        }
    });
}


// Function to Delete Material
function deleteMaterial(id) {
    Swal.fire({
        title: 'Are you sure?',
        text: "This action cannot be undone!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
        if (result.isConfirmed) {
            jQuery.ajax({
                url: `{{ route('material-delete', '') }}/${id}`,
                type: 'POST',  // Change from DELETE to POST
                data: {
                    _method: 'DELETE',  // Laravel requires this for DELETE requests
                    _token: "{{ csrf_token() }}" // Include CSRF token
                },
                success: function(response) {
                    Swal.fire('Deleted!', response.message, 'success').then(() => {
                        location.reload();
                    });
                },
                error: function(xhr) {
                    Swal.fire('Error', 'Failed to delete material', 'error');
                    console.log(xhr.responseText);
                }
            });
        }
    });
}

    </script>



</x-app-layout>
