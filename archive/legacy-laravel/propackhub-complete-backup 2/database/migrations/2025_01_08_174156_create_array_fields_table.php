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
        Schema::create('array_fields', function (Blueprint $table) {
            $table->id();
            $table->foreignId('main_table_id')->constrained('main_table')->onDelete('cascade');
            $table->string('solid-input')->nullable();
            $table->string('micron-input')->nullable();
            $table->string('density-input')->nullable();
            $table->string('total-gsm-input')->nullable();
            $table->string('waste-input')->nullable();
            $table->string('cost-m-input')->nullable();
            $table->string('estimated-kg-req-input')->nullable();
            $table->string('lower-input')->nullable();
            $table->string('cost-per-kg-input')->nullable();
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('array_fields');
    }
};
