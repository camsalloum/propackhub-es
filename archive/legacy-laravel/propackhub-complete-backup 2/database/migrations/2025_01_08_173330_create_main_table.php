<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('main_table', function (Blueprint $table) {
            $table->id();
            $table->string('customerName')->nullable();
            $table->string('jobName')->nullable();
            $table->string('productType');
            $table->string('units');
            $table->integer('orderQuantity')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('main_table');
    }
};
