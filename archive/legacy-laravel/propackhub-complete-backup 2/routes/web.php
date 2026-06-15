<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\FormController;
use App\Http\Controllers\Calculator;
use Illuminate\Support\Facades\Route;
use App\Http\Middleware\CheckAdmin;
use App\Http\Controllers\OptimizeController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\SubCategory;
use App\Http\Controllers\Logo;




Route::get('/', function () {
    return redirect()->route('register');
});

Route::get('/dashboard', function () {
    return view('dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
    Route::get('/users', [UserController::class, 'index'])->name('users.index');
    Route::delete('/users/{user}', [UserController::class, 'destroy'])->name('users.destroy');
    Route::get('/users/{user}/edit', [UserController::class, 'edit'])->name('users.edit');
    Route::post('/users/{user}/status', [UserController::class, 'updateStatus'])->name('users.updateStatus');
    Route::get('/users/{id}', [UserController::class, 'show'])->name('users.show');
    Route::put('/users/{id}', [UserController::class, 'update'])->name('users.update');
    Route::post('/feedback', [UserController::class, 'feedbackStore'])->name('feedback.store');

    Route::resource('forms', FormController::class);
    Route::post('/download-pdf/{id}', [FormController::class, 'downloadPDF'])->name('download.pdf');
    Route::get('print.view', [FormController::class, 'print_view'])->name('print.view');
    Route::get('/materials/{name}', [FormController::class, 'getMaterialData']);
    Route::get('/allMaterials', [FormController::class, 'getAllMaterial'])->name('allMaterials');
    Route::get('/materials/{id}/edit', [FormController::class, 'editMaterial'])->name('materials.edit');
    Route::get('/material-show/{id}', [FormController::class, 'materialShow'])->name('material-show');
    Route::delete('/material-delete/{id}', [FormController::class, 'materialDestroy'])->name('material-delete');
    Route::post('/materials/{id}', [FormController::class, 'materialUpdate'])->name('materials.update');
    Route::get('/materials', [FormController::class, 'addMaterial'])->name('materials.create');
    Route::post('/material-update', [FormController::class, 'storeMaterial'])->name('materials.store');
    Route::get('/get-materials', [FormController::class, 'showMaterials'])->name('get-materials');

    Route::resource('categories', CategoryController::class);
    Route::resource('subcategories', SubCategory::class);
    Route::get('/logo-setting', [Logo::class, 'index'])->name('logo.show');
    Route::put('/update-logo', [Logo::class, 'update'])->name('update.logo');
    Route::get('/tutorial', function () {
    
    return view('tutorial');    
    
    })->name('tutorial');
    

});

Route::get('/clear-cache', function() {
    \Artisan::call('config:clear');
    \Artisan::call('cache:clear');
    \Artisan::call('optimize:clear');
    return "Cache cleared!";
});


Route::get('/test-path', function() {
    return response()->json([
        'public_path' => public_path(),
        'correct_public_path' => realpath(base_path('../public_html')),
    ]);
});

Route::get('/optimize-app', [OptimizeController::class, 'runOptimize']);

require __DIR__.'/auth.php';
