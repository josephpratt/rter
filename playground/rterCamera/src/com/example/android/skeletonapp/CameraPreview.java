/*
 * Copyright (C) 2007 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package com.example.android.skeletonapp;

import android.annotation.TargetApi;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.graphics.BitmapFactory;
import android.hardware.Camera;
import android.hardware.Camera.CameraInfo;
import android.hardware.Camera.PictureCallback;
import android.hardware.Camera.Size;
import android.os.AsyncTask;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.util.Base64;
import android.util.Log;
import android.view.Menu;
import android.view.MenuInflater;
import android.view.MenuItem;
import android.view.SurfaceHolder;
import android.view.SurfaceView;
import android.view.View;
import android.view.View.OnClickListener;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.provider.Settings.Secure;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Timer;

import org.apache.http.HttpEntity;
import org.apache.http.HttpResponse;
import org.apache.http.HttpVersion;
import org.apache.http.client.HttpClient;
import org.apache.http.client.ClientProtocolException;
import org.apache.http.client.ResponseHandler;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.mime.HttpMultipartMode;
import org.apache.http.entity.mime.MultipartEntity;
import org.apache.http.entity.mime.content.FileBody;
import org.apache.http.entity.mime.content.StringBody;
import org.apache.http.impl.client.DefaultHttpClient;
import org.apache.http.params.BasicHttpParams;
import org.apache.http.params.CoreProtocolPNames;
import org.apache.http.params.HttpParams;
import org.apache.http.util.EntityUtils;


// Need the following import to get access to the app resources, since this
// class is in a sub-package.
import com.example.android.skeletonapp.R;

// ----------------------------------------------------------------------

@TargetApi(Build.VERSION_CODES.GINGERBREAD)
public class CameraPreview extends Activity implements OnClickListener{
    private Preview mPreview;
    Camera mCamera;
    int numberOfCameras;
    int cameraCurrentlyLocked;
    PictureCallback mPicture = null;
    // The first rear facing camera
    int defaultCameraId;
    static boolean isFPS = false;
    
    private String android_id = Secure.getString(getApplicationContext().getContentResolver(),
            Secure.ANDROID_ID);
    
    
    private static final String TAG = "CameraPreview Activity";
	protected static final String MEDIA_TYPE_IMAGE = null;	
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Log.e(TAG, "onCreate");
        // Hide the window title.
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);

        // Create a RelativeLayout container that will hold a SurfaceView,
        // and set it as the content of our activity.
        mPreview = new Preview(this);
        
        setContentView(mPreview);
        mPreview.setOnClickListener(this);
        
        // Find the total number of cameras available
        numberOfCameras = Camera.getNumberOfCameras();

        // Find the ID of the default camera
        CameraInfo cameraInfo = new CameraInfo();
            for (int i = 0; i < numberOfCameras; i++) {
                Camera.getCameraInfo(i, cameraInfo);
                if (cameraInfo.facing == CameraInfo.CAMERA_FACING_BACK) {
                    defaultCameraId = i;
                }
            }
//          


    }
//    private File getOutputMediaFile(String mediaTypeImage) {
//		// TODO Auto-generated method stub
//    	// To be safe, you should check that the SDCard is mounted
//        // using Environment.getExternalStorageState() before doing this.
//
//        File mediaStorageDir = new File(Environment.getExternalStoragePublicDirectory(
//                  Environment.DIRECTORY_PICTURES), "MyCameraApp");
//
//
//        // This location works best if you want the created images to be shared
//        // between applications and persist after your app has been uninstalled.
//
//        // Create the storage directory if it does not exist
//        if (! mediaStorageDir.exists()){
//            if (! mediaStorageDir.mkdirs()){
//                return null;
//            }
//        }
//
//        // Create a media file name
//        String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss").format(new  ());
//        File mediaFile;
//        if (type == MEDIA_TYPE_IMAGE){
//            mediaFile = new File(mediaStorageDir.getPath() + File.separator +
//            "IMG_"+ timeStamp + ".jpg");
//        } else {
//            return null;
//        }
//
//        return mediaFile;
//	}
    
    
    @Override
    protected void onResume() {
        super.onResume();
        Log.e(TAG, "onResume");
        // Open the default i.e. the first rear facing camera.
        mCamera = Camera.open();
        cameraCurrentlyLocked = defaultCameraId;
        mPreview.setCamera(mCamera);
    }

    @Override
    protected void onPause() {
        super.onPause();
        Log.e(TAG, "onPause");
        // Because the Camera object is a shared resource, it's very
        // important to release it when the activity is paused.
        if (mCamera != null) {
            mPreview.setCamera(null);
            mCamera.release();
            mCamera = null;
            mPreview.inPreview = false;
        }
    }

	@Override
	public void onClick(View v) {
		// TODO Auto-generated method stub
		 Log.e(TAG, "onClick");
		 isFPS = !isFPS;
		 Log.e(TAG, "onClick changes isFPS : " + isFPS);
		 if(isFPS){
			 
			 mCamera.takePicture(null, null, photoCallback);
			 Log.d(TAG, "takrpicture called");
			 mPreview.inPreview = false;
		 }

	}
	
	Camera.PictureCallback photoCallback=new Camera.PictureCallback() {
	    public void onPictureTaken(byte[] data, Camera camera) {
	    	Log.e(TAG, "Inside Picture Callback");
	    	new SavePhotoTask().execute(data);
	      camera.startPreview();
	      mPreview.inPreview=true;
	      
	    try {
	    	    	
			Thread.sleep(5000);
			if(isFPS){
				Log.d(TAG, "Picture taken");
				mCamera.takePicture(null, null, photoCallback);
			}
			
		} catch (InterruptedException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	       
	    }
	  };

//    @Override
//    public boolean onCreateOptionsMenu(Menu menu) {
//
//        // Inflate our menu which can gather user input for switching camera
//        MenuInflater inflater = getMenuInflater();
//        inflater.inflate(R.menu.camera_menu, menu);
//        return true;
//    }
//
//    @Override
//    public boolean onOptionsItemSelected(MenuItem item) {
//        // Handle item selection
//        switch (item.getItemId()) {
//        case R.id.switch_cam:
//            // check for availability of multiple cameras
//            if (numberOfCameras == 1) {
//                AlertDialog.Builder builder = new AlertDialog.Builder(this);
//                builder.setMessage(this.getString(R.string.camera_alert))
//                       .setNeutralButton("Close", null);
//                AlertDialog alert = builder.create();
//                alert.show();
//                return true;
//            }
//
//            // OK, we have multiple cameras.
//            // Release this camera -> cameraCurrentlyLocked
//            if (mCamera != null) {
//                mCamera.stopPreview();
//                mPreview.setCamera(null);
//                mCamera.release();
//                mCamera = null;
//            }
//
//            // Acquire the next camera and request Preview to reconfigure
//            // parameters.
//            mCamera = Camera
//                    .open((cameraCurrentlyLocked + 1) % numberOfCameras);
//            cameraCurrentlyLocked = (cameraCurrentlyLocked + 1)
//                    % numberOfCameras;
//            mPreview.switchCamera(mCamera);
//
//            // Start the preview
//            mCamera.startPreview();
//            return true;
//        default:
//            return super.onOptionsItemSelected(item);
//        }
//    }
	
	protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
    }
}

// ----------------------------------------------------------------------

/**
 * A simple wrapper around a Camera and a SurfaceView that renders a centered preview of the Camera
 * to the surface. We need to center the SurfaceView because not all devices have cameras that
 * support preview sizes at the same aspect ratio as the device's display.
 */
class Preview extends ViewGroup implements SurfaceHolder.Callback  {
    private final String TAG = "Preview";
     
    SurfaceView mSurfaceView;
    SurfaceHolder mHolder;
    Size mPreviewSize;
    List<Size> mSupportedPreviewSizes;
    Camera mCamera;
    boolean inPreview = false;
    Preview(Context context) {
        super(context);
        Log.e(TAG, "Instantiate Preview");
        mSurfaceView = new SurfaceView(context);
        addView(mSurfaceView);
        
        // Install a SurfaceHolder.Callback so we get notified when the
        // underlying surface is created and destroyed.
        mHolder = mSurfaceView.getHolder();
        mHolder.addCallback(this);
        mHolder.setType(SurfaceHolder.SURFACE_TYPE_PUSH_BUFFERS);
    }

    public void setCamera(Camera camera) {
        mCamera = camera;
        if (mCamera != null) {
            mSupportedPreviewSizes = mCamera.getParameters().getSupportedPreviewSizes();
            requestLayout();
        }
        Log.e(TAG, "Camera Set");
    }

    public void switchCamera(Camera camera) {
       setCamera(camera);
       try {
           camera.setPreviewDisplay(mHolder);
       } catch (IOException exception) {
           Log.e(TAG, "IOException caused by setPreviewDisplay()", exception);
       }
       Camera.Parameters parameters = camera.getParameters();
       parameters.setPreviewSize(mPreviewSize.width, mPreviewSize.height);
       requestLayout();

       camera.setParameters(parameters);
    }

    @Override
    protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
        // We purposely disregard child measurements because act as a
        // wrapper to a SurfaceView that centers the camera preview instead
        // of stretching it.
    	Log.e(TAG, "onMeasure");
    	final int width = resolveSize(getSuggestedMinimumWidth(), widthMeasureSpec);
        final int height = resolveSize(getSuggestedMinimumHeight(), heightMeasureSpec);
        setMeasuredDimension(width, height);

        if (mSupportedPreviewSizes != null) {
            mPreviewSize = getOptimalPreviewSize(mSupportedPreviewSizes, width, height);
        }
    }

    @Override
    protected void onLayout(boolean changed, int l, int t, int r, int b) {
    	Log.e(TAG, "onLayout");
    	if (changed && getChildCount() > 0) {
            final View child = getChildAt(0);

            final int width = r - l;
            final int height = b - t;

            int previewWidth = width;
            int previewHeight = height;
            if (mPreviewSize != null) {
                previewWidth = mPreviewSize.width;
                previewHeight = mPreviewSize.height;
            }

            // Center the child SurfaceView within the parent.
            if (width * previewHeight > height * previewWidth) {
                final int scaledChildWidth = previewWidth * height / previewHeight;
                child.layout((width - scaledChildWidth) / 2, 0,
                        (width + scaledChildWidth) / 2, height);
            } else {
                final int scaledChildHeight = previewHeight * width / previewWidth;
                child.layout(0, (height - scaledChildHeight) / 2,
                        width, (height + scaledChildHeight) / 2);
            }
        }
    }

    public void surfaceCreated(SurfaceHolder holder) {
        // The Surface has been created, acquire the camera and tell it where
        // to draw.
    	
    	try {
            if (mCamera != null) {
                mCamera.setPreviewDisplay(holder);
                Log.e(TAG, "setPreviewDisplay(holder)");
            }
        } catch (IOException exception) {
            Log.e(TAG, "IOException caused by setPreviewDisplay()", exception);
        }
    }

    public void surfaceDestroyed(SurfaceHolder holder) {
        // Surface will be destroyed when we return, so stop the preview.
        if (mCamera != null) {
            mCamera.stopPreview();
            Log.e(TAG, "stopPreview()");
        }
    }


    private Size getOptimalPreviewSize(List<Size> sizes, int w, int h) {
        final double ASPECT_TOLERANCE = 0.1;
        double targetRatio = (double) w / h;
        if (sizes == null) return null;

        Size optimalSize = null;
        double minDiff = Double.MAX_VALUE;

        int targetHeight = h;

        // Try to find an size match aspect ratio and size
        for (Size size : sizes) {
            double ratio = (double) size.width / size.height;
            if (Math.abs(ratio - targetRatio) > ASPECT_TOLERANCE) continue;
            if (Math.abs(size.height - targetHeight) < minDiff) {
                optimalSize = size;
                minDiff = Math.abs(size.height - targetHeight);
            }
        }

        // Cannot find the one match the aspect ratio, ignore the requirement
        if (optimalSize == null) {
            minDiff = Double.MAX_VALUE;
            for (Size size : sizes) {
                if (Math.abs(size.height - targetHeight) < minDiff) {
                    optimalSize = size;
                    minDiff = Math.abs(size.height - targetHeight);
                }
            }
        }
        return optimalSize;
    }

    public void surfaceChanged(SurfaceHolder holder, int format, int w, int h) {
        // Now that the size is known, set up the camera parameters and begin
        // the preview.
    	if (inPreview) {
            mCamera.stopPreview();
            
        }
    	
    	Camera.Parameters parameters = mCamera.getParameters();
        parameters.setPreviewSize(mPreviewSize.width, mPreviewSize.height);
        requestLayout();
        mCamera.setParameters(parameters);
        mCamera.startPreview();
        inPreview = true;
    }

}

class SavePhotoTask extends AsyncTask<byte[], String, String> {
    
	private DefaultHttpClient mHttpClient;
	
	@Override
    protected String doInBackground(byte[]... jpeg) {
    	
		Log.e("SavePhotoTask", "Fileoutput");
    	
		
		HttpParams params = new BasicHttpParams();
        params.setParameter(CoreProtocolPNames.PROTOCOL_VERSION, HttpVersion.HTTP_1_1);
        mHttpClient = new DefaultHttpClient(params);
		
		
//    	String temp=Base64.encodeToString(jpeg[0], Base64.DEFAULT);
//    	Log.e("SavePhotoTask", "Base64 string is :" + temp);
    	
    	// save in SD Card
    	SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd hh:mm:ss.SSS");
    	String timeStamp = new SimpleDateFormat("_yyyy_MM_dd_hh_mm_ss_SSS").format(new Date());
    	
    	File photo=
          new File(Environment.getExternalStorageDirectory()+"/rter/",
                   "Scenephoto"+timeStamp+".jpg");
    	Log.d("SavePhotoTask", "Saving pic" +  "Scenephoto"+timeStamp+".jpg");
      if (photo.exists()) {
        photo.delete();
      }

      try {
    	  FileOutputStream fos=new FileOutputStream(photo.getPath());
          
          fos.write(jpeg[0]);
          fos.close();
          
    	  HttpPost httppost = new HttpPost("http://142.157.58.188:8082/nehil");

          MultipartEntity multipartEntity = new MultipartEntity(HttpMultipartMode.BROWSER_COMPATIBLE);  
          multipartEntity.addPart("title", new StringBody("rTER"));
//          multipartEntity.addPart("Nick", new StringBody("Nick"));
//          multipartEntity.addPart("Email", new StringBody("Email"));
//          multipartEntity.addPart("Description", new StringBody(Settings.SHARE.TEXT));
          multipartEntity.addPart("image", new FileBody(photo));
          httppost.setEntity(multipartEntity);

          mHttpClient.execute(httppost, new PhotoUploadResponseHandler());
    	  
    	  
    	  
      } catch (java.io.IOException e) { 
        Log.e("PictureDemo", "Exception in photoCallback", e);
      } catch (Exception e) {
        Log.e("ServerError", e.getLocalizedMessage(), e);
      }

      return(null);
    }
	
	private class PhotoUploadResponseHandler implements ResponseHandler {

        @Override
        public Object handleResponse(HttpResponse response)
                throws ClientProtocolException, IOException {

            HttpEntity r_entity = response.getEntity();
            String responseString = EntityUtils.toString(r_entity);
            Log.d("UPLOAD", responseString);

            return null;
        }

    }
  }
