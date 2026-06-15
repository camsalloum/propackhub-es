
<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-2xl text-[#1363a6] leading-tight">
            {{ __('Material') }}
        </h2>
    </x-slot>

    <style>
        input[type="search"] { margin-bottom: 10px; }
        th { color: #1363a6; }
        .bg-gray-200 { background-color: #1363a6; color: white; }
        .hover\:bg-gray-100:hover { background-color: #e0f3ff; }
        .p-6.bg-white.border-b.border-gray-200.mt-5.user-table { border-color:#1363a6; }
        .swal2-confirm { background-color:#1363a6 !important; }
        .swal2-icon { border-color: #1363a6 !important; color:#1363a6 !important; }

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
                        <a href="{{ route('subcategories.create') }}" style="background-color: #1363a6;" class="px-4 py-2 text-white rounded-lg hover:bg-[#0e4b87]">Add Material</a>
                    </div>
                    

                    <div class="overflow-x-auto">
                        <table id="userTable" class="w-full table-auto border-collapse text-sm text-left text-gray-700">
                            <thead class="bg-gray-200 text-gray-800">
                                <tr>
                                    <th class="px-6 py-3 text-center font-medium uppercase text-white">#</th>
                                    <th class="px-6 py-3 font-medium uppercase text-white">Type</th>
                                    <th class="px-6 py-3 font-medium uppercase text-white">Material</th>
                                    @if (auth()->user()->user_level == 'level-1' || auth()->user()->user_type == 'admin')
                                    <th class="px-6 py-3 text-center font-medium uppercase text-white">Actions</th>
                                    @endif
                                </tr>
                            </thead>
                            <tbody>
                                @if(!empty($subcategories))
                                @foreach ($subcategories as $record)
                                    <tr class="border-b hover:bg-gray-100">
                                        <td class="px-6 py-4">{{ $loop->iteration }}</td>
                                        <td class="px-6 py-4">{{ $record->category->category_name }}</td>
                                        <td class="px-6 py-4">{{ $record->name }}</td>
                                        <td class="px-6 py-4">
                                            <div class="flex items-center space-x-4">
                                                <!-- Edit Button -->
                                                <a href="{{ route('subcategories.edit', $record->id) }}" class="text-green-600 hover:text-green-800">
                                                    <i class="fas fa-edit"></i>
                                                </a>

                                                <!-- Delete Button -->
                                                <button onclick="deleteCategory({{ $record->id }})" class="text-red-600 hover:text-red-800">
                                                    <i class="fas fa-trash"></i>
                                                </button>

                                                <!-- Delete Form (Hidden) -->
                                                <form id="delete-form-{{ $record->id }}" action="{{ route('subcategories.destroy', $record->id) }}" method="POST" style="display: none;">
                                                    @csrf
                                                    @method('DELETE')
                                                </form>
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

    <!-- DataTables and jQuery -->
    
    <link rel="stylesheet" href="https://cdn.datatables.net/1.13.6/css/jquery.dataTables.min.css">
    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js"></script>
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
            columnDefs: [{ orderable: false, targets: -1 }]
        });

        function deleteCategory(id) {
            Swal.fire({
                title: 'Are you sure?',
                text: "You won't be able to revert this!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Yes, delete it!'
            }).then((result) => {
                if (result.isConfirmed) {
                    document.getElementById('delete-form-' + id).submit();
                }
            });
        }
    </script>
</x-app-layout>
