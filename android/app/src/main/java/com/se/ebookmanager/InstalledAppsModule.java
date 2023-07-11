package com.se.ebookmanager;


import android.content.pm.PackageInfo;
import android.content.pm.ApplicationInfo;
import android.content.Intent;
import android.os.Build;
import android.net.Uri;
import android.provider.Settings;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.Promise;

import java.io.ByteArrayOutputStream;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

import javax.annotation.Nullable;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.drawable.BitmapDrawable;
import android.graphics.drawable.Drawable;
import android.util.Base64;
import android.app.Instrumentation;
import android.view.KeyEvent;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;


public class InstalledAppsModule extends ReactContextBaseJavaModule {

    private final ReactApplicationContext reactContext;
    private Instrumentation inst = new Instrumentation();


    private class AppDetail {
        CharSequence label;
        CharSequence name;
        Drawable icon;
        //CharSequence icon;
        public String toString() {
            Bitmap icon;
            if(this.icon.getIntrinsicWidth() <= 0 || this.icon.getIntrinsicHeight() <= 0) {
                icon = Bitmap.createBitmap(1, 1, Bitmap.Config.ARGB_8888); // Single color bitmap will be created of 1x1 pixel
            } else {
                icon = Bitmap.createBitmap(this.icon.getIntrinsicWidth(), this.icon.getIntrinsicHeight(), Bitmap.Config.ARGB_8888);
            }
            final Canvas canvas = new Canvas(icon);
            this.icon.setBounds(0, 0, canvas.getWidth(), canvas.getHeight());
            this.icon.draw(canvas);

            ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
            icon.compress(Bitmap.CompressFormat.PNG, 100, byteArrayOutputStream);
            byte[] byteArray = byteArrayOutputStream.toByteArray();
            String encoded = Base64.encodeToString(byteArray, Base64.NO_WRAP);

            return "{\"label\":\"" + this.label + "\",\"name\":\"" + this.name + "\",\"icon\":\"" + encoded + "\"}";
        }
    }

    public InstalledAppsModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "InstalledApps";
    }



    @ReactMethod
    private void inputKey(){
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    inst.sendKeyDownUpSync(KeyEvent.KEYCODE_PAGE_DOWN);
                } catch (Exception e) {}
            }
        }).start();

    }

    // Backup
    @ReactMethod
    public void getApps(Promise promise){
        //List<AppDetail> apps = new ArrayList<>();
        try {
            JSONArray apps = new JSONArray();

            List<PackageInfo> packages = this.reactContext
                .getPackageManager()
                .getInstalledPackages(0);

            for(final PackageInfo p: packages){
                if (this.reactContext.getPackageManager().getLaunchIntentForPackage(p.packageName) != null) {
                    //AppDetail app = new AppDetail();
                    // app.label = p.applicationInfo.loadLabel(this.reactContext.getPackageManager());
                    // app.name = p.packageName;
                    // app.icon = p.applicationInfo.loadIcon(this.reactContext.getPackageManager());
                    // apps.add(app);
                    try {
                        JSONObject app = new JSONObject();
                        app.put("label", p.applicationInfo.loadLabel(this.reactContext.getPackageManager()));
                        app.put("name", p.packageName);
                        
                        // versionName, versionCode 추가
                        app.put("versionName", p.versionName);

                        // if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                        //     app.put("versionCode", p.getLongVersionCode());
                        // } else {
                        //     app.put("versionCode", p.versionCode);
                        // }
                        app.put("versionCode", Build.VERSION.SDK_INT >= Build.VERSION_CODES.P ? p.getLongVersionCode() : p.versionCode);

                        //app.put("icon", p.applicationInfo.loadIcon(this.reactContext.getPackageManager());

                        // icon disabled
                        // Drawable origIcon = p.applicationInfo.loadIcon(this.reactContext.getPackageManager());
                        // Bitmap icon;
                        // if(origIcon.getIntrinsicWidth() <= 0 || origIcon.getIntrinsicHeight() <= 0) {
                        //     icon = Bitmap.createBitmap(1, 1, Bitmap.Config.ARGB_8888); // Single color bitmap will be created of 1x1 pixel
                        // } else {
                        //     icon = Bitmap.createBitmap(origIcon.getIntrinsicWidth(), origIcon.getIntrinsicHeight(), Bitmap.Config.ARGB_8888);
                        // }
                        
                        // final Canvas canvas = new Canvas(icon);
                        // origIcon.setBounds(0, 0, canvas.getWidth(), canvas.getHeight());
                        // origIcon.draw(canvas);

                        // ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
                        // icon.compress(Bitmap.CompressFormat.PNG, 100, byteArrayOutputStream);
                        // byte[] byteArray = byteArrayOutputStream.toByteArray();
                        // String encoded = Base64.encodeToString(byteArray, Base64.NO_WRAP);

                        // app.put("icon", encoded);
                                
                        apps.put(app);
                    } catch (JSONException e) {
                        throw new RuntimeException(e);
                    }
                }
            }
            // return apps.toString();
            //return apps.toJSONString();
            promise.resolve(apps.toString());
        } catch (Exception e) {
            promise.reject("INSTALLEDAPPS_ERROR", e);
        }

    }



    private List<String> getAllApps() {
        List<PackageInfo> packages = this.reactContext
            .getPackageManager()
            .getInstalledPackages(0);

        List<String> ret = new ArrayList<>();
        for (final PackageInfo p: packages) {
            ret.add(p.packageName);
        }
        return ret;
    }

    private List<String> getNonSystemApps() {
        List<PackageInfo> packages = this.reactContext
            .getPackageManager()
            .getInstalledPackages(0);

        List<String> ret = new ArrayList<>();
        for (final PackageInfo p: packages) {
            if ((p.applicationInfo.flags & ApplicationInfo.FLAG_SYSTEM) == 0) {
                ret.add(p.packageName);
            }
        }
        return ret;
    } 
    
    @ReactMethod
    private void launchApplication(String packageName){
        Intent launchIntent = this.reactContext.getPackageManager().getLaunchIntentForPackage(packageName);
        if (launchIntent != null) { 
            this.reactContext.startActivity(launchIntent);//null pointer check in case package name was not found
        }
    }

    @ReactMethod
    private void deleteApplication(String packageName){
        Intent intent = new Intent(Intent.ACTION_DELETE);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        intent.setData(Uri.parse("package:" + packageName));
        this.reactContext.startActivity(intent);
    }

    @ReactMethod
    private void showApplicationSetting(String packageName){
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NO_ANIMATION);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        Uri uri = Uri.fromParts("package", packageName, null);
        intent.setData(uri);
        this.reactContext.startActivity(intent);
    }


    @ReactMethod
    private String getAndroidRelease(){
        return Build.VERSION.RELEASE;
    }

    @Override
    public @Nullable Map<String, Object> getConstants() {
        Map<String, Object> constants = new HashMap<>();

        // constants.put("getApps", getApps());
        // constants.put("getNonSystemApps", getNonSystemApps());
        return constants;
    }
}