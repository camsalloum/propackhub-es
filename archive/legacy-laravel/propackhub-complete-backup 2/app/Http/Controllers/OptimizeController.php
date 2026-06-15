<?php
namespace App\Http\Controllers;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Http\Request;

class OptimizeController extends Controller
{
    public function runOptimize()
    {
        // Running optimize command
        Artisan::call('optimize');
        return response()->json(['message' => 'Application optimized successfully']);
    }
}