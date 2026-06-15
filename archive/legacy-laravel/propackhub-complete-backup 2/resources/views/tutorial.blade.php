@extends('layouts.custom')

@section('content')

<div class="container d-flex justify-content-center align-items-center min-vh-100">
    <div class="bg-white shadow-lg rounded p-4 p-md-5 text-center w-100" style="max-width: 800px;">
        <h1 class="mb-4 fw-bold text-primary" style="color:rgb(19 99 166) !important;">How to Use This Application</h1>

        <!-- Responsive Video Player -->
        <div class="ratio ratio-16x9 rounded overflow-hidden shadow-sm">
            <video class="w-100" controls>
                <source src="{{ asset('assets/Tutorial.mp4') }}" type="video/mp4">
                Your browser does not support the video tag.
            </video>
        </div>

        <p class="mt-4 text-muted">
            This video will guide you through using the application. If you have any questions, feel free to contact support.
        </p>
    </div>
</div>

@endsection
